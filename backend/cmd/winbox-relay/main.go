// WinBox relay: import a MikroTik Back-To-Home WireGuard *client* conf on the
// server, then TCP-proxy public :8291 → 192.168.216.1:8291 through that tunnel.
// Admins open WinBox to the cloud IP — no WireGuard install on their PC.
package main

import (
	"bufio"
	"context"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/netip"
	"strings"
	"sync"
	"time"

	"golang.zx2c4.com/wireguard/conn"
	"golang.zx2c4.com/wireguard/device"
	"golang.zx2c4.com/wireguard/tun/netstack"
)

const (
	controlAddr = "127.0.0.1:4091"
	listenAddr  = "0.0.0.0:8291"
	routerWinbox = "192.168.216.1:8291"
)

type armRequest struct {
	Token  string `json:"token"`
	Config string `json:"config"`
}

type statusResponse struct {
	OK     bool   `json:"ok"`
	Armed  bool   `json:"armed"`
	Token  string `json:"token,omitempty"`
	Listen string `json:"listen"`
	Target string `json:"target"`
	Error  string `json:"error,omitempty"`
}

type tunnel struct {
	token  string
	dev    *device.Device
	tnet   *netstack.Net
	cancel context.CancelFunc
}

var (
	mu      sync.Mutex
	active  *tunnel
	tcpLn   net.Listener
	lastErr string
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lmsgprefix)
	log.SetPrefix("[winbox-relay] ")

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, status())
	})
	mux.HandleFunc("/arm", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "POST only", http.StatusMethodNotAllowed)
			return
		}
		var body armRequest
		if err := json.NewDecoder(io.LimitReader(r.Body, 32<<10)).Decode(&body); err != nil {
			http.Error(w, "bad json", http.StatusBadRequest)
			return
		}
		if err := arm(body.Token, body.Config); err != nil {
			lastErr = err.Error()
			log.Printf("arm failed: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			writeJSON(w, status())
			return
		}
		lastErr = ""
		writeJSON(w, status())
	})
	mux.HandleFunc("/disarm", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "POST only", http.StatusMethodNotAllowed)
			return
		}
		disarm()
		writeJSON(w, status())
	})

	go func() {
		if err := ensureTCP(); err != nil {
			log.Fatalf("listen %s: %v", listenAddr, err)
		}
	}()

	log.Printf("control %s — WinBox TCP %s → %s (when armed)", controlAddr, listenAddr, routerWinbox)
	if err := http.ListenAndServe(controlAddr, mux); err != nil {
		log.Fatal(err)
	}
}

func status() statusResponse {
	mu.Lock()
	defer mu.Unlock()
	s := statusResponse{OK: true, Listen: listenAddr, Target: routerWinbox, Error: lastErr}
	if active != nil {
		s.Armed = true
		s.Token = active.token
	}
	return s
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func arm(token, conf string) error {
	token = strings.TrimSpace(token)
	conf = strings.TrimSpace(conf)
	if token == "" || !strings.Contains(conf, "[Interface]") {
		return errors.New("token and WireGuard config required")
	}
	priv, addr, peerPub, endpoint, keepalive, allowed, err := parseConf(conf)
	if err != nil {
		return err
	}
	clientAddr, err := netip.ParseAddr(addr)
	if err != nil {
		return fmt.Errorf("client address: %w", err)
	}

	tun, tnet, err := netstack.CreateNetTUN([]netip.Addr{clientAddr}, []netip.Addr{netip.MustParseAddr("1.1.1.1")}, 1420)
	if err != nil {
		return fmt.Errorf("netstack: %w", err)
	}
	dev := device.NewDevice(tun, conn.NewDefaultBind(), device.NewLogger(device.LogLevelError, "(hp-wg) "))

	ipc := fmt.Sprintf("private_key=%s\n", priv)
	ipc += fmt.Sprintf("public_key=%s\n", peerPub)
	if endpoint != "" {
		ipc += fmt.Sprintf("endpoint=%s\n", endpoint)
	}
	if keepalive > 0 {
		ipc += fmt.Sprintf("persistent_keepalive_interval=%d\n", keepalive)
	}
	for _, a := range allowed {
		ipc += fmt.Sprintf("allowed_ip=%s\n", a)
	}
	if err := dev.IpcSet(ipc); err != nil {
		dev.Close()
		return fmt.Errorf("wg configure: %w", err)
	}
	dev.Up()

	ctx, cancel := context.WithCancel(context.Background())
	mu.Lock()
	if active != nil {
		active.cancel()
		active.dev.Close()
	}
	active = &tunnel{token: token, dev: dev, tnet: tnet, cancel: cancel}
	mu.Unlock()

	_ = ctx
	log.Printf("armed token=%s… client=%s peer=%s", token[:min(8, len(token))], clientAddr, endpoint)
	return nil
}

func disarm() {
	mu.Lock()
	defer mu.Unlock()
	if active == nil {
		return
	}
	active.cancel()
	active.dev.Close()
	log.Printf("disarmed token=%s…", active.token[:min(8, len(active.token))])
	active = nil
}

func ensureTCP() error {
	ln, err := net.Listen("tcp", listenAddr)
	if err != nil {
		return err
	}
	tcpLn = ln
	log.Printf("TCP proxy listening on %s", listenAddr)
	for {
		c, err := ln.Accept()
		if err != nil {
			return err
		}
		go handleConn(c)
	}
}

func handleConn(c net.Conn) {
	defer c.Close()
	_ = c.SetDeadline(time.Now().Add(45 * time.Second))

	mu.Lock()
	t := active
	mu.Unlock()
	if t == nil || t.tnet == nil {
		return
	}

	up, err := t.tnet.Dial("tcp", routerWinbox)
	if err != nil {
		log.Printf("dial router WinBox: %v", err)
		return
	}
	defer up.Close()
	_ = c.SetDeadline(time.Time{})
	_ = up.SetDeadline(time.Time{})

	var wg sync.WaitGroup
	wg.Add(2)
	go func() { defer wg.Done(); _, _ = io.Copy(up, c); _ = up.Close(); _ = c.Close() }()
	go func() { defer wg.Done(); _, _ = io.Copy(c, up); _ = c.Close(); _ = up.Close() }()
	wg.Wait()
}

func parseConf(conf string) (privHex, address, peerPubHex, endpoint string, keepalive int, allowed []string, err error) {
	var section string
	sc := bufio.NewScanner(strings.NewReader(conf))
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]") {
			section = strings.ToLower(strings.Trim(line, "[]"))
			continue
		}
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(strings.ToLower(key))
		val = strings.TrimSpace(val)
		switch section {
		case "interface":
			switch key {
			case "privatekey":
				privHex, err = keyToHex(val)
				if err != nil {
					return
				}
			case "address":
				address = strings.Split(val, ",")[0]
				address = strings.TrimSpace(strings.Split(address, "/")[0])
			}
		case "peer":
			switch key {
			case "publickey":
				peerPubHex, err = keyToHex(val)
				if err != nil {
					return
				}
			case "endpoint":
				endpoint = val
			case "persistentkeepalive":
				fmt.Sscanf(val, "%d", &keepalive)
			case "allowedips":
				for _, part := range strings.Split(val, ",") {
					part = strings.TrimSpace(part)
					if part != "" {
						allowed = append(allowed, part)
					}
				}
			}
		}
	}
	if privHex == "" || peerPubHex == "" {
		err = errors.New("config missing PrivateKey or Peer PublicKey")
		return
	}
	if address == "" {
		address = "192.168.216.2"
	}
	if len(allowed) == 0 {
		allowed = []string{"0.0.0.0/0"}
	}
	if keepalive == 0 {
		keepalive = 25
	}
	return
}

func keyToHex(b64 string) (string, error) {
	raw, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return "", fmt.Errorf("key base64: %w", err)
	}
	if len(raw) != 32 {
		return "", fmt.Errorf("key length %d, want 32", len(raw))
	}
	return hex.EncodeToString(raw), nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
