# Official platform icons (optional)

By default YOULIP.FUN shows its own monogram badges for each platform.
To use official icons instead, download them from each platform's brand / press kit
(and follow their usage guidelines), put the files here, then map them in
`src/config/config.json`:

```json
"platformIcons": {
  "youtube": "/platforms/youtube.svg",
  "tiktok": "/platforms/tiktok.svg",
  "facebook": "/platforms/facebook.svg",
  "x": "/platforms/x.svg",
  "instagram": "/platforms/instagram.svg",
  "twitch": "/platforms/twitch.svg",
  "kick": "/platforms/kick.svg",
  "rumble": "/platforms/rumble.svg"
}
```

Keys: youtube, tiktok, facebook, x, instagram, twitch, kick, rumble, other.
Any key left out keeps the monogram badge.
