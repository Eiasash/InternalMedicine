# Image Dependency Audit - 2026-06-12

Scope: confirmation-only pass for image-dependent InternalMedicine questions flagged by the FM/IM cross-vendor audit handoff.

Guardrails:
- No answer keys, accepted answers, explanations, option text, or question stems were changed.
- Each listed item already has an `img` value in `data/questions.json`.
- Each image URL was checked with an HTTP HEAD request on 2026-06-12 and returned `200 image/jpeg`.

| idx | source field | HTTP result |
| --- | --- | --- |
| 5 | `pnimit_img_2020_2.jpg` | `200 image/jpeg`, 97979 bytes |
| 7 | `pnimit_img_2020_3.jpg` | `200 image/jpeg`, 112811 bytes |
| 41 | `pnimit_img_2020_9.jpg` | `200 image/jpeg`, 53054 bytes |
| 203 | `pnimit_Jun21_p117_img1.jpeg` | `200 image/jpeg`, 115654 bytes |
| 279 | `pnimit_Jun22_t8.jpeg` | `200 image/jpeg`, 11611 bytes |
| 343 | `pnimit_Jun22_t16.jpeg` | `200 image/jpeg`, 56316 bytes |
| 367 | `pnimit_Jun22_t20.jpeg` | `200 image/jpeg`, 60985 bytes |
| 376 | `pnimit_Jun22_t23.jpeg` | `200 image/jpeg`, 7245 bytes |
| 380 | `pnimit_Jun22_t24.jpeg` | `200 image/jpeg`, 6470 bytes |
| 449 | `pnimit_Jun23_t8.jpeg` | `200 image/jpeg`, 66543 bytes |
| 477 | `pnimit_Jun23_t14.jpeg` | `200 image/jpeg`, 52133 bytes |
| 503 | `pnimit_Jun23_t20.jpeg` | `200 image/jpeg`, 24453 bytes |
| 525 | `pnimit_May24_t2.jpeg` | `200 image/jpeg`, 91221 bytes |
| 557 | `pnimit_May24_t5.jpeg` | `200 image/jpeg`, 132420 bytes |
| 678 | `pnimit_Oct24_pg08.jpg` | `200 image/jpeg`, 494254 bytes |

Conclusion: all 15 handed-off InternalMedicine image-dependent items are already wired to reachable JPEG assets. No IM data fix is needed.
