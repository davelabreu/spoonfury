# Fridge Sticker NavBar Design (Soft Neo-brutalist)

**Date:** 2026-02-17  
**Status:** Approved  
**Goal:** Transform the NavBar from a minimal "slididng bubble" UI to a playful, high-energy "Fridge Sticker" aesthetic with "Fury" (stirring) animations.

## Visual Language: "Soft Neo-brutalist"
- **Borders**: 2.5px solid black (`border-[2.5px] border-black`).
- **Corners**: Large rounding (`rounded-xl`) to keep it modern and friendly.
- **Shadows**: Hard, non-blurred offset shadows (`shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`).
- **Interaction**: The "Fridge Sticker" effect. Buttons "pop" off the surface when hovered/active.

## The Palette (Food Groups)
- **Stir the Pot**: Tomato Red (`bg-[#FF6B6B]`)
- **My Books**: Sage Green (`bg-[#4ECDC4]`)
- **+ Recipe**: Butter Yellow (`bg-[#FFE66D]`)
- **Sign In/Join**: Lavender (`bg-[#A29BFE]`)

## Animations (Framer Motion)
- **The "Lift"**: `whileHover={{ y: -4, shadow: "6px 6px 0px 0px rgba(0,0,0,1)" }}`
- **The "Fury" (Stir)**: A jitter/vibration keyframe sequence on hover `rotate: [0, -1.5, 1.5, -1.5, 0]`.
- **Active State**: The active tab stays in the "Lifted" position (`y: -4`) with the larger shadow to indicate selection.

## "Stir the Pot" Special Treatment
- **Gradient**: Animated `background-position` on a linear gradient (Tomato to Orange).
- **Icon**: `Utensils` (Spoon/Fork) icon.
- **Steam**: 2-3 tiny floating particles (`motion.span`) that float up on hover.

## Revertability
- The logic is contained within `NavBar.tsx`. 
- Reverting involves restoring the previous mapping logic and removing the `NavSticker` component.
- The CSS is standard Tailwind; no global style changes are required.
