# Map Editing Instructions: Stairs and Teleport Tiles

To support movement between floors (z-levels), use the following conventions in your map .txt files:

## Stairs Up
- Use: `[id,S,TYPE(stairs_up)]`
- Example: `[12,S,TYPE(stairs_up)]`
- When a player steps on this tile, they will move up one floor (z+1).

## Stairs Down
- Use: `[id,S,TYPE(stairs_down)]`
- Example: `[13,S,TYPE(stairs_down)]`
- When a player steps on this tile, they will move down one floor (z-1).

## Teleport
- Use: `[id,S,TYPE(teleport)]`
- Example: `[14,S,TYPE(teleport)]`
- When a player steps on this tile, custom teleport logic can be applied (to be defined).

## Notes
- `id` is the sprite or tile id as usual.
- `S` means the tile is walkable.
- You can combine these with other modifiers as needed.
- The parser in MapLoader.js will automatically detect the `TYPE(...)` and set the tile's `type` property.

---

**After editing your map files, ensure you reload the server to clear the map cache.**
