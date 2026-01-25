# Glassmorphism UI Playbook

This is the definitive guide for Weavr's "Glass" aesthetic. Use these recipes to replace Material UI components with modern, translucent Tailwind elements.

## 1. Core Design Philosophy

-   **Layered Depth**: Instead of solid surfaces, use translucency (`bg-opacity`) + blur (`backdrop-blur`).
-   **Light Source**: Visualize a light source from top-left. Top borders are brighter (`border-t-white/40`), bottom borders are darker/invisible.
-   **Vibrancy**: The background MUST have gradients or blobs. Glass over a solid grey background just looks like dirty plastic.

## 2. The Recipes (Copy-Paste)

### A. The "Glass Panel" (Cards, Sidebars, Modals)

**Light Mode**:
```html
<div class="bg-white/30 backdrop-blur-xl border border-white/40 shadow-xl shadow-black/5 rounded-2xl">
```

**Dark Mode**:
```html
<div class="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 rounded-2xl">
```

### B. The "Glass Button"

**Primary**:
```html
<button class="px-6 py-2 rounded-full bg-gradient-to-r from-purple-500/80 to-blue-500/80 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/30 transition-all active:scale-95 backdrop-blur-md border border-white/20">
```

**Secondary / Ghost**:
```html
<button class="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-800 dark:text-slate-200 border border-white/10 transition-all backdrop-blur-sm">
```

### C. The "Crystal Input"

```html
<input class="w-full bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-slate-500 dark:placeholder-slate-400 backdrop-blur-md transition-all" />
```

## 3. The "Background" (Crucial)

To make glass work, the `body` or main wrapper needs a gradient.

```html
<!-- Dark Mode Example -->
<div class="fixed inset-0 -z-10 bg-slate-950">
  <div class="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
  <div class="absolute top-0 -right-4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
  <div class="absolute -bottom-32 left-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
</div>
```

## 4. Migration Prompt (Copy this to an Agent)

> "Refactor the `<ComponentName>` to use the Weavr Glassmorphism design.
> 1. Remove all `Mui*` components and `sx` props.
> 2. Use a `<div>`, `<button>`, or `<input>` with Tailwind classes.
> 3. Apply the **Glass Panel** recipe for the container: `bg-slate-900/60 backdrop-blur-xl border-white/10`.
> 4. Ensure text contrast is high (Inter font, `text-slate-100`).
> 5. Make it responsive."
