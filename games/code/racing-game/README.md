<div align="center">

# 🏎️ Poly City Racer: Turbo

### *High-Octane 3D Racing in a Neon Cyberpunk City*

[![Racing Game](https://img.shields.io/badge/Game-Racing-ff3366?style=for-the-badge)](https://bhanu2006-24.github.io/racing-game/)
[![Three.js](https://img.shields.io/badge/Three.js-r128-00ffcc?style=for-the-badge)](https://threejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

### **[🚀 PLAY NOW →](https://bhanu2006-24.github.io/racing-game/)**

</div>

---

## 🎬 Game Preview

<div align="center">

### 🏁 Race Menu
<img src="public/start.png" alt="Main Menu" width="700"/>

*Dynamic menu with neon cyberpunk aesthetics*

---

### ⏱️ Countdown Intensity
<img src="public/go.png" alt="Countdown" width="700"/>

*Ready... Set... GO!*

---

### 🏆 Victory Celebration
<img src="public/won.png" alt="Victory Screen" width="700"/>

*Cross the finish line first and claim your victory!*

</div>

---

## ✨ Features at a Glance

<table>
<tr>
<td width="50%">

### 🌃 **Immersive 3D World**
- 350+ procedurally generated buildings
- Neon-lit cyberpunk skyscrapers
- Dynamic fog & professional lighting
- Smooth curved racing track

</td>
<td width="50%">

### 🏁 **Competitive Racing**
- 3 AI opponents with unique strategies
- 3-lap championship race
- Real-time position tracking
- Smart collision avoidance

</td>
</tr>
<tr>
<td width="50%">

### 🚗 **Advanced Physics**
- Realistic car dynamics
- Nitrous boost system
- Drift mechanics
- Building collision detection

</td>
<td width="50%">

### 🎨 **Premium Visuals**
- Real-time minimap
- Particle effects (drift/nitro)
- Dynamic camera with FOV shifts
- Cyberpunk color palette

</td>
</tr>
</table>

---

## 🎮 Controls

<div align="center">

| Key | Action | Key | Action |
|:---:|:------|:---:|:------|
| `W` / `↑` | **Accelerate** | `S` / `↓` | **Brake/Reverse** |
| `A` / `←` | **Turn Left** | `D` / `→` | **Turn Right** |
| `SHIFT` | **Nitrous Boost** 🔥 | `SPACE` | **Brake** |
| `R` | **Reset Car** | - | - |

</div>

---

## 🚀 Quick Start

### Option 1: Play Online
```
🌐 https://bhanu2006-24.github.io/racing-game/
```

### Option 2: Run Locally

```bash
# Clone the repository
git clone https://github.com/bhanu2006-24/racing-game.git
cd racing-game

# Open directly in browser
open index.html
```

### Option 3: Local Server

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx http-server -p 8000

# Then visit: http://localhost:8000
```

---

## � Pro Tips

<div align="center">

| Tip | Strategy |
|-----|----------|
| 🏃 **Start Strong** | Lead from lap one to control the race |
| 🌀 **Drift Smart** | Use controlled drifts to maintain corner speed |
| ⚡ **Nitro Timing** | Save boosts for straightaways, not corners |
| 🏗️ **Avoid Buildings** | Collisions reverse momentum - stay on track! |
| 🗺️ **Watch Minimap** | Track opponent positions strategically |

</div>

---

## 🛠️ Technical Stack

<div align="center">

| Technology | Purpose |
|:----------:|:--------|
| ![Three.js](https://img.shields.io/badge/Three.js-r128-black?style=flat-square&logo=three.js) | 3D Graphics Engine |
| ![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?style=flat-square&logo=javascript) | Game Logic & Physics |
| ![HTML5](https://img.shields.io/badge/HTML5-Structure-orange?style=flat-square&logo=html5) | Page Structure |
| ![CSS3](https://img.shields.io/badge/CSS3-Styling-blue?style=flat-square&logo=css3) | UI & HUD Design |

</div>

### Architecture Highlights

```
🎮 Game Engine
├── CarController class → Physics, AI, player input
├── ParticleSystem class → Visual effects
├── Track generation → Catmull-Rom curves
└── City generation → Procedural buildings

⚙️ Systems
├── Physics → Velocity, friction, collision
├── AI → Pathfinding, speed variation, avoidance
└── Racing → Lap tracking, position calculation
```

---

## 🎨 Customization Guide

<details>
<summary><b>🎨 Change Car Colors</b></summary>

```javascript
const COLORS = [0xff3366, 0x00ccff, 0xccff00, 0xcc00ff];
// Player ↑    AI1 ↑       AI2 ↑       AI3 ↑
```
</details>

<details>
<summary><b>🏎️ Adjust Physics</b></summary>

```javascript
this.acceleration = 0.035;   // Acceleration rate
this.maxSpeed = 2.4;         // Maximum speed
this.turnSpeed = 0.045;      // Turn rate
this.nitroMaxSpeed = 3.5;    // Nitro max speed
```
</details>

<details>
<summary><b>🏁 Modify Race Settings</b></summary>

```javascript
const TOTAL_LAPS = 3;        // Number of laps
const TRACK_SCALE = 1.2;     // Track size multiplier
```
</details>

---

## 🗺️ Roadmap

### 🎯 Upcoming Features

- [ ] 🎵 Sound effects & background music
- [ ] 🏆 Multiple tracks & difficulty levels
- [ ] ⚡ Power-ups & boost pads
- [ ] 💾 Save/load race records
- [ ] 🎯 Time trial mode
- [ ] 📱 Mobile touch controls
- [ ] 🌐 Multiplayer racing (WebRTC)

---

## � Project Structure

```
racing-game/
│
├── 📄 index.html       # Main game file (self-contained)
├── 📁 public/          # Screenshot assets
│   ├── start.png
│   ├── go.png
│   └── won.png
├── 📖 README.md        # This file
├── 📜 LICENSE          # MIT License
└── 🚫 .gitignore       # Git ignore rules
```

---

## 🤝 Contributing

<div align="center">

Contributions are welcome! Here's how you can help:

[![Fork](https://img.shields.io/badge/Fork-Repository-blue?style=for-the-badge)](https://github.com/bhanu2006-24/racing-game/fork)
[![Issues](https://img.shields.io/badge/Report-Issues-red?style=for-the-badge)](https://github.com/bhanu2006-24/racing-game/issues)
[![Pull Request](https://img.shields.io/badge/Submit-PR-green?style=for-the-badge)](https://github.com/bhanu2006-24/racing-game/pulls)

</div>

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit** your changes
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push** to the branch
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open** a Pull Request

---

## 📄 License

<div align="center">

This project is licensed under the **MIT License**

See [LICENSE](LICENSE) file for details

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

</div>

---

## 👨‍💻 Author

<div align="center">

**Bhanu Pratap Saini**

[![GitHub](https://img.shields.io/badge/GitHub-bhanu2006--24-181717?style=for-the-badge&logo=github)](https://github.com/bhanu2006-24)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=for-the-badge&logo=linkedin)](https://linkedin.com/in/bhanu-saini-3bb251391)

</div>

---

## 🙏 Acknowledgments

<div align="center">

🌟 **Three.js Team** - Amazing 3D graphics library  
🎮 **Classic Arcade Racers** - Inspiration and nostalgia  
🌃 **Cyberpunk Aesthetic** - Visual design inspiration  

</div>

---

<div align="center">

### 🌟 Show Your Support

**If you enjoyed this game, give it a ⭐️!**

### Ready to race? 🏁

**[PLAY NOW →](https://bhanu2006-24.github.io/racing-game/)**

---

*Built with ❤️ and ☕ by [Bhanu Pratap Saini](https://github.com/bhanu2006-24)*

</div>
