---
title: "Source seeking"
summary: "Robot swarms that find the source of an unknown scalar field - without gradient measurements and resilient to robot failures."
order: 3
---

Source seeking asks a group of robots to locate the maximum of an unknown signal - a gas leak, a heat source, a radio emitter. Instead of measuring gradients or keeping a rigid formation, the swarm computes an ascending direction from the robots' individual readings, so it keeps working when robots fail or the formation deforms. The approach is fully distributed and extends to 3D through geometric control on SO(3).
