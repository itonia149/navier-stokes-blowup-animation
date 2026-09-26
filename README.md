# Navier–Stokes blowup animation

A text-free JavaScript animation inspired by the finite-time Navier–Stokes blowup construction released by OpenAI.

## Video

**[▶ Watch the rendered animation on Google Drive](https://drive.google.com/file/d/1KJ7Vr1KPmXPds1KPuqdeorN1USkAuM6Z/view?usp=sharing)**

**[⬇ Download the MP4](https://drive.google.com/uc?export=download&id=1KJ7Vr1KPmXPds1KPuqdeorN1USkAuM6Z)**

The rendered video is hosted on Google Drive so the Git repository can stay lightweight.

## What is being visualized

The animation is built around the central blowup scalings from the construction, with

```text
radial scale:  l_r ~ tau^(1/2)
axial scale:   l_z ~ tau^(1/2-h)
velocity:      |u_theta|, |u_z| ~ tau^(-1/2-h)
radial speed:  |u_r| = O(tau^(-1/2))
```

using `h = 0.008 < 1/100`.

The rendered local field is an exact divergence-free affine surrogate,

```text
u_r     = -a r / tau
u_z     =  2a z / tau
u_theta = omega_0 r tau^(-1-h)
```

chosen so that the visible contraction, axial outflow, swirl, and singular scaling agree with the asymptotic mechanism being illustrated.

The camera zoom is deliberately cinematic and is **not** a physical scale. The terminal whiteout is also an optical effect: the animation does not depict a fake outward explosion or shock wave.

This is **not a numerical CFD simulation of the full constructed solution**. It is an artistic mathematical visualization of the proved scaling structure and qualitative geometry.

## Run locally

Open `index.html` in a modern browser.

Click the canvas to pause or resume playback.

For a local web server:

```bash
python -m http.server 8000
```

then open `http://localhost:8000`.

## Sources and attribution

The mathematical inspiration is OpenAI's Navier–Stokes / Euler work:

- [OpenAI paper (PDF)](https://cdn.openai.com/pdf/32d9f210-8b73-45e0-91bc-82a30aef8a9a/navier-stokes.pdf)
- [OpenAI NavierStokesAndEuler repository](https://github.com/openai/NavierStokesAndEuler)

OpenAI's `NavierStokesAndEuler` repository is distributed under the Apache License 2.0.

This repository contains an independently written visualization implementation. The code in **this repository** is released under the MIT License. The MIT License here does **not** relicense OpenAI's paper, repository, text, figures, or other copyrighted material.

## License

MIT — see [LICENSE](LICENSE).
