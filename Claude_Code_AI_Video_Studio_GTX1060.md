# AI Video Studio for GTX 1060 (Claude Code Project)

## Objective
Build a completely free local AI video generation environment optimized for:

- CPU: Intel Core i7-7700HQ
- RAM: 16 GB
- GPU: NVIDIA GeForce GTX 1060
- OS: Windows 10/11

Claude Code should perform all setup, configuration, optimization, documentation, and workflow creation required to make the system operational.

---

## Success Criteria

The final system must:

1. Run locally.
2. Require no paid APIs.
3. Support text-to-image.
4. Support image-to-video.
5. Export MP4 files.
6. Be optimized for GTX 1060 hardware.
7. Include beginner-friendly documentation.
8. Include automation scripts.
9. Be organized for future upgrades.

---

## Required Software

Install and configure:

- Python 3.10
- Git
- FFmpeg
- ComfyUI

Verify all dependencies.

---

## AI Models

Preferred image models:

- Stable Diffusion 1.5
- DreamShaper
- Realistic Vision

Avoid heavy models unless low-VRAM compatible.

Examples:

- Flux (avoid by default)
- SD3 (avoid by default)
- Heavy SDXL workflows (avoid by default)

---

## Video Generation

Create workflows for:

### Workflow 1
Text → Image

### Workflow 2
Image → Video

### Workflow 3
Image → MP4 Export

Target output:

- 512x512 preferred
- 576x576 maximum

Video duration:

- 2–4 seconds

---

## Performance Optimization

Enable:

- xformers
- low VRAM mode
- tiled VAE
- attention slicing
- memory-efficient execution

Optimize specifically for GTX 1060.

---

## Folder Structure

/project
/models
/workflows
/output
/scripts
/docs

---

## Startup Scripts

Create:

- start.bat
- update.bat
- run_low_vram.bat

---

## Automation

Build scripts that:

1. Generate images from prompts.
2. Convert generated images to short videos.
3. Export MP4 automatically.
4. Save outputs to organized folders.

---

## Ready-Made Workflows

Create:

### Meme Coin Promo

Animated promotional visuals.

### Crypto Animation

Short crypto-themed videos.

### AI Character

Simple talking character workflow.

### Cinematic Scene

Short cinematic clips.

### Shorts Generator

TikTok / Reels / Shorts format.

---

## Documentation

Create detailed documentation:

### Installation

Complete setup guide.

### Troubleshooting

Common errors and fixes.

### Performance Tuning

GTX 1060 optimization guide.

### Upgrade Guide

Future hardware upgrades.

---

## Deliverables

Claude Code should provide:

- Working installation
- Configuration files
- Workflows
- Scripts
- Documentation
- Optimization settings

Everything must be free, local, and runnable on the specified hardware.
