# Android Studio Icon Pack (AgroGuard)

This folder contains a copy-ready Android launcher icon resource pack generated from the AgroGuard leaf identity.

## Generate resources

From `frontend/` run:

```bash
npm run icons:android
```

Generated output will appear in:

- `android-icon-pack/res/mipmap-mdpi`
- `android-icon-pack/res/mipmap-hdpi`
- `android-icon-pack/res/mipmap-xhdpi`
- `android-icon-pack/res/mipmap-xxhdpi`
- `android-icon-pack/res/mipmap-xxxhdpi`
- `android-icon-pack/res/mipmap-anydpi-v26`
- `android-icon-pack/res/mipmap-anydpi-v33`
- `android-icon-pack/res/drawable-nodpi`
- `android-icon-pack/res/values`

## Integrate into Android Studio

1. Open your Android project (the wrapper project that loads this web app).
2. Go to `app/src/main/res`.
3. Copy the generated folders from `android-icon-pack/res/` into that `res` directory.
4. If Android Studio asks to merge/overwrite `ic_launcher` assets, choose overwrite for icon files.
5. Rebuild the app.

## Source assets

- Full icon: `public/app-icon.svg`
- Adaptive foreground: `android-icon-pack/source/ic_launcher_foreground.svg`
- Adaptive monochrome: `android-icon-pack/source/ic_launcher_monochrome.svg`

## Notes

- Background color is set to `#1B5E20` via `values/ic_launcher_colors.xml`.
- `mipmap-anydpi-v33` includes monochrome icon support for Android 13 themed icons.
- Re-run `npm run icons:android` after changing source icon SVG files.
