---
title: "Búsqueda de fuentes"
summary: "Enjambres de robots que localizan la fuente de un campo escalar desconocido, sin medir gradientes y resistentes a fallos."
---

La búsqueda de fuentes consiste en que un grupo de robots localice el máximo de una señal desconocida: una fuga de gas, un foco de calor, un emisor de radio. En lugar de medir gradientes o mantener una formación rígida, el enjambre calcula una dirección ascendente a partir de las lecturas individuales de los robots, por lo que sigue funcionando aunque fallen robots o se deforme la formación. El método es totalmente distribuido y se extiende a 3D mediante control geométrico en SO(3).
