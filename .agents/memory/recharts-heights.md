---
name: Recharts ResponsiveContainer heights
description: ResponsiveContainer must receive explicit pixel heights; Tailwind h-[Npx] on parent doesn't work
---

When using Recharts `ResponsiveContainer` inside a div with a Tailwind `h-[Npx]` class and `height="100%"` on ResponsiveContainer, the chart renders at essentially zero height (tiny sliver visible).

**Why:** ResponsiveContainer calculates its size from the DOM at mount time; Tailwind's arbitrary-value classes sometimes aren't resolved in time, giving the container 0 height.

**How to apply:** Always pass explicit pixel heights directly to ResponsiveContainer:

```tsx
<ResponsiveContainer width="100%" height={250}>
  <AreaChart data={data}>...</AreaChart>
</ResponsiveContainer>
```

Remove the `h-[250px]` wrapper div or use `style={{ height: 250 }}` instead.
