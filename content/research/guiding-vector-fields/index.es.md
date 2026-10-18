---
title: "Campos vectoriales de guiado"
summary: "Seguimiento de caminos en espacios euclídeos y en variedades, controlando cómo converge y avanza el robot."
---

Un campo vectorial de guiado (GVF) lleva a un robot hacia un camino deseado y a lo largo de él usando solo su estado actual. Este trabajo extiende los GVF en dos direcciones. Con **cinemática inversa**, la dinámica del error de seguimiento pasa a ser una entrada de diseño, de modo que se puede prescribir el movimiento transitorio. Por ejemplo, una oscilación controlada alrededor del camino. Con **GVF sin singularidades en SO(3)**, el camino está definido sobre la propia variedad de actitudes, lo que permite maniobras acrobáticas autónomas en aviones de ala fija.
