# Multi-IP Multi-Port Static Web Proof on a Single Physical Host

This project proves that **a single physical Linux machine** can host **multiple IP addresses** on a single network interface (`enp4s0`), binding each IP and port through **Nginx** to route incoming outside traffic to distinct local backend services (`localhost:9001` through `localhost:9005`), serving **5 unique visual flavor themes**.

---

## 🏗️ Architecture & Network Mapping

```text
       [ External Client / LAN Device ]
          (e.g., Phone, Laptop, PC)
                     │
    ┌────────────────┴────────────────┐
    │                                 │
    ▼                                 ▼
192.168.0.101:9001               192.168.0.102:9002 ... (up to 5 IPs)
    │                                 │
    └────────────────┬────────────────┘
                     │ (Traffic hits physical NIC: enp4s0)
                     ▼
        ┌─────────────────────────┐
        │   Nginx Reverse Proxy   │ (Host Network Mode)
        └────────────┬────────────┘
                     │
    ┌────────────────┴────────────────┬───────────────────────────────┐
    ▼                                 ▼                               ▼
127.0.0.1:9001                   127.0.0.1:9002                  127.0.0.1:9005
[Flavor 01: Crimson Solaris]     [Flavor 02: Cyber Azure]        [Flavor 05: Solar Amber]
```

### Routing Table

| Flavor | Outside LAN URL | Interface | Reverse Proxied To | Visual Identity |
| :--- | :--- | :--- | :--- | :--- |
| **01** | `http://192.168.0.101:9001/` | `enp4s0` | `http://127.0.0.1:9001/` | **Crimson Solaris** (Fiery Ruby / Red) |
| **02** | `http://192.168.0.102:9002/` | `enp4s0` | `http://127.0.0.1:9002/` | **Cyber Azure** (Electric Cyan / Ocean) |
| **03** | `http://192.168.0.103:9003/` | `enp4s0` | `http://127.0.0.1:9003/` | **Emerald Aurora** (Jade / Cyber Mint) |
| **04** | `http://192.168.0.104:9004/` | `enp4s0` | `http://127.0.0.1:9004/` | **Neon Amethyst** (Ultraviolet / Pink) |
| **05** | `http://192.168.0.106:9005/` | `enp4s0` | `http://127.0.0.1:9005/` | **Solar Amber** (Golden Honey / Obsidian) |

*(Note: `192.168.0.105` is occupied by another device on this LAN, so `192.168.0.106` is used for Flavor 5. You can customize any IP in `scripts/config.env` and `nginx/nginx.conf`.)*

---

## 🚀 Quick Start Guide

### Step 1: Assign the 5 Secondary IP Addresses to your Physical Interface

Run the setup script:

```bash
./scripts/setup_ips.sh
```

> **How this works**: On Linux, multiple IP addresses can be assigned to a single interface with `ip addr add <IP>/24 dev enp4s0`. The script automatically applies this using your permissions (or via Docker network admin container if sudo password prompt is non-interactive).

Verify that all 5 IPs are now attached to your physical card:
```bash
ip -brief addr show dev enp4s0
```

---

### Step 2: Start the System with Docker Compose

Run the backend services and Nginx in host network mode:

```bash
docker compose up -d --build
```

To view live access logs:
```bash
docker compose logs -f
```

---

### Step 3: Verify the Endpoints

Run the automated endpoint tester:

```bash
./scripts/test_endpoints.sh
```

You will see:
```text
[+] Flavor 01 (Crimson Solaris)
    External Target: http://192.168.0.101:9001
    >>> EXTERNAL STATUS: [200 OK] (Direct IP Access Verified!)
        Header: X-Flavor: Crimson Solaris

[+] Flavor 02 (Cyber Azure)
    External Target: http://192.168.0.102:9002
    >>> EXTERNAL STATUS: [200 OK] (Direct IP Access Verified!)
        Header: X-Flavor: Cyber Azure
...
```

---

## 📱 Testing From Outside Traffic (The Proof)

To verify that your single physical machine is successfully receiving and serving outside traffic over 5 separate IPs:

1. Connect any other device (smartphone, tablet, laptop, or another PC) to the same local network.
2. Open the browser and visit any of the addresses:
   - `http://192.168.0.101:9001/`
   - `http://192.168.0.102:9002/`
   - `http://192.168.0.103:9003/`
   - `http://192.168.0.104:9004/`
   - `http://192.168.0.106:9005/`
3. Notice:
   - Each IP loads a completely distinct flavor theme and routing card.
   - The interactive switcher allows jumping between all 5 flavors.
   - The diagnostics panel inspects client IP, roundtrip ping, and request headers (`X-Real-IP`, `X-Forwarded-For`, `X-Target-IP`).

---

## 🧹 Teardown & Cleanup

When you are done testing, stop the containers and clean up the secondary IPs:

```bash
# 1. Stop Docker containers
docker compose down

# 2. Remove the 5 secondary IPs from enp4s0
./scripts/teardown_ips.sh
```

---

## ❓ Frequently Asked Questions & Networking Deep Dive

### 1. Do I need to configure anything in my router?

**For local network (LAN) access: No.** 

You do **not** need to touch your router configuration for devices in your home or office (phones, tablets, other PCs) to reach each IP. 

#### How does the network know which IP belongs to which machine? (The ARP Protocol)
On a local network (Wi-Fi / Ethernet), devices do not communicate directly via IP addresses at Layer 2; they communicate using hardware **MAC addresses**.

When any device on your Wi-Fi or LAN wants to open `http://192.168.0.101:9001/`:

```text
[Phone / Laptop / Client]                       [Your Linux Machine (enp4s0)]
           │                                                  │
           │─── 1. ARP Broadcast: "Who has 192.168.0.101?" ──►│ (Heard by all LAN devices)
           │                                                  │
           │◄── 2. ARP Reply: "I do! My MAC is a2:b6:56:..." ─│ (Kernel replies automatically)
           │                                                  │
           │─── 3. HTTP Traffic sent directly to that MAC ───►│ (Direct Layer 2 delivery)
```

1. **ARP Request**: The client broadcasts: *"Who has IP `192.168.0.101`?"*
2. **ARP Response**: Because `192.168.0.101` is attached to `enp4s0`, your Linux kernel replies: *"That's me! Send it to MAC `a2:b6:56:8e:a3:d4`."*
3. **Delivery**: The client caches this mapping and sends Ethernet frames directly to your network card.

> **Key Takeaway**: A single physical network card (one MAC address) can legally and effortlessly answer for dozens or hundreds of different IP addresses simultaneously.

---

### 2. How to Prevent DHCP IP Collisions

Your router runs a **DHCP Server** that automatically distributes IP addresses to phones, smart TVs, and laptops when they join the network.

- Most routers hand out IPs within a specific dynamic pool (e.g., `192.168.0.100` to `192.168.0.254`).
- *(For example, `192.168.0.105` was already assigned to another Wi-Fi device by the router's DHCP server, which is why Flavor 5 uses `192.168.0.106`.)*

**Recommended Best Practices:**
1. **Option 1 (No router changes):** Select static IPs outside the router's DHCP pool (for instance, if DHCP is `192.168.0.100-250`, assign `192.168.0.20` through `192.168.0.25`).
2. **Option 2 (In router settings):** Log into your router's web portal (`http://192.168.0.1`) and adjust the DHCP starting address to `192.168.0.120`, reserving `.101` through `.110` for your static physical bindings.

---

### 3. Why did port 80 show an Apache page instead of Nginx?

If you change the Nginx listen directive to port `80` (e.g., `listen 192.168.0.101:80;`) and see the **"Apache2 Ubuntu Default Page: It works"**:

- **Root Cause**: Apache (`apache2.service`) is installed and running natively on the host machine, listening on wildcard `*:80`.
- **Port Conflict**: Because Docker Compose runs with `network_mode: "host"`, Nginx tried to bind to port 80 and crashed with:
  ```text
  nginx: [emerg] bind() to 192.168.0.101:80 failed (98: Address in use)
  ```
- **Fix**: Stop Apache to free up port 80 for Nginx:
  ```bash
  sudo systemctl stop apache2
  docker compose restart nginx
  ```
  *(Or keep using dedicated ports such as `9001` through `9005` in `nginx/nginx.conf`.)*

---

### 4. What if I want access from the Public Internet (WAN)?

If you want someone outside your home/office network to access these pages over the public internet:
- **Port Forwarding (NAT)**: Your router must forward incoming WAN requests to your physical machine's internal IPs:
  - WAN Port `9001` &rarr; `192.168.0.101:9001`
  - WAN Port `9002` &rarr; `192.168.0.102:9002`
- **Multiple Public IPs**: If your ISP provides you with a block of multiple public static IPs, you can configure 1:1 NAT in your router mapping each public IP directly to each internal IP.

