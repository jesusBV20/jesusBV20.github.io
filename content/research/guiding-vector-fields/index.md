---
title: "Guiding vector fields"
summary: "Path following on Euclidean spaces and on manifolds, with control over how the robot converges and moves along the path."
order: 1
---

A guiding vector field (GVF) steers a robot towards a desired path and along it, using only the robot's position. My work extends GVFs in two directions. With **inverse kinematics**, the dynamics of the path-following error become a design input, so the transient motion - for example, a controlled oscillation around the path - can be prescribed. With **singularity-free GVFs on SO(3)**, the path lives on the attitude manifold itself, which opens the door to autonomous aerobatic manoeuvres on fixed-wing aircraft.
