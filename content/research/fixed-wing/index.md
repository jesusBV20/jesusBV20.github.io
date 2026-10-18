---
title: "Autonomous fixed-wing aircraft"
summary: "From theory to flight: formation flight, crosswind navigation and autonomous aerobatics on real drones."
order: 5
videos: [55N0cbsjq08, RwpAXYvPU0E, 8VweHQ4zHbs, TcFsgs0tSGE, v8to32dYVnc]
---

Fixed-wing drones are efficient but hard to coordinate: they cannot stop, and their airspeed is tightly bounded. I implement and test our algorithms onboard real aircraft running [Palomo](https://www.swarmsystemslab.eu/projects/palomo/), our modified version of the open-source [Paparazzi](https://github.com/paparazzi/paparazzi) autopilot (not yet public) - distributed formation flight that needs no speed actuation, guidance that keeps the trajectory in strong crosswinds, and fully autonomous aerobatics with guiding vector fields on SO(3).
