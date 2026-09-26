# Navier–Stokes blowup animation


A JavaScript animation inspired by the finite-time Navier–Stokes blowup construction released by OpenAI.


## Video


https://github.com/user-attachments/assets/003eb7c3-8044-4d98-9b85-80033812822a


The rendered video is stored directly in this repository as [`blowup.mp4`](./blowup.mp4).


## What is being visualized


The animation is built around the central blowup scalings from the construction,


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
