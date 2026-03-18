---
name: Chakra UI v3 patterns
description: Chakra v3 (3.34.0) style prop patterns and gotchas discovered during inline-to-Chakra migration
type: project
---

Chakra UI v3 does NOT support the `sx` prop on Box/Flex/Text. Use direct style props instead (e.g., `gridTemplateRows`, `transition` as props).

**Why:** The `sx` prop was a v2 feature. In v3 with `createSystem`, all CSS properties are available as direct style props on Chakra components.

**How to apply:** When migrating inline styles, map every CSS property directly to a Chakra style prop. For `@keyframes` animations on non-Chakra elements (Lucide icons, raw SVGs), `style={{}}` is acceptable since those elements don't accept Chakra style props.

Available Chakra v3 exports: Box, Flex, Text, Stack, HStack, VStack, Grid, Skeleton, Spinner, Badge, chakra (factory).

The `chakra.button`, `chakra.input` factory elements accept all Chakra style props and are useful for semantic HTML elements that need Chakra styling.
