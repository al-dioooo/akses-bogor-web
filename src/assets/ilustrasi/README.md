# Ilustrasi

Gambar ilustrasi AksesBogor ([ADR-0027](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0027-design-system-datar-dan-ilustrasi-3d.md)). Semuanya dibuat dengan `gpt-image-2` lewat tool `image_gen` di Codex CLI 0.166, lalu diubah ke WebP dengan `sharp`. Ini ilustrasi, bukan foto lokasi, dan tidak menggambarkan kondisi tempat mana pun.

## halte-ke-pintu.webp

Hero Beranda, 1774 × 887 px, dibuat 2026-10-31 dalam dua langkah.

1. Gambar acuan, tanpa gambar input:

   > Create one wide landscape 16:9 hero illustration for AksesBogor, a public-place accessibility website in Kota Bogor, Indonesia. Soft stylised 3D render, matte clay materials, chunky low-poly trees and shrubs, clean ambient-occlusion shading, gentle daylight, slight tilt-shift depth of field, playful but calm civic style. Dominant structural violet #6440E8 on roofs, path edges, railings, benches and accents; lavender #B8A4FF and #EAE4FF; warm off-white #F9F9F7 and cream #F1ECDF ground and walls; yellow #F2C230 tactile guiding tiles with raised lines and dots; angkot green #1E9E6E, foliage greens, small sky-blue details. No other strong hues except the explicitly requested small status pictograms. Elevated three-quarter camera. Cluster the scene in the lower and right parts, leaving a large calm empty pale background in the upper-left third for a headline. Nothing important touches the left edge above the middle. Small respectful people in Indonesian everyday clothing, some women in hijab; an independent wheelchair user and a person with a white cane following tactile paving. Absolutely no text, letters, numbers, logos, signage words or watermarks. Pictograms only. Option 1, Halte ke pintu: Bogor street corner with a green angkot minibus beside a covered halte with purple roof. A continuous yellow guiding-block path runs from the shelter across a zebra crossing using dropped kerbs to a public building. Building entrance has both steps and a long gentle accessible ramp with purple handrails, plus a glass lift tower on its side. Big Kebun Raya style trees behind, a small light rain cloud far right. Show the wheelchair user moving independently along the ramp and the white-cane pedestrian on tactile paving. Include a subtle accessible-toilet doorway with a wheelchair pictogram only. Produce a single image, not a collage.

2. Versi lebar, dengan gambar langkah 1 sebagai acuan gaya:

   > The attached image is the approved hero illustration for AksesBogor (an accessibility map of public places in Kota Bogor, Indonesia). Keep its exact art style, materials, palette, lighting and level of detail: soft stylised 3D clay render, chunky low-poly trees, violet #6440E8 architecture accents, lavender tints, cream/off-white ground, yellow #F2C230 tactile guiding blocks, green Bogor angkot, Indonesian people in everyday clothes (some in hijab), slight tilt-shift. Absolutely no text, letters, numbers, logos or watermarks; pictograms only. The same scene re-composed as a very wide landscape banner (about 2:1, as large as the tool allows). Shift the whole scene to the right so it fills only the right ~60% of the frame. The left ~40% must be calm: pale hazy sky in the upper part fading into soft distant hills and a few low trees near the bottom, with the road and pavement continuing out of the bottom-left corner. Nothing busy in the left 40% above the bottom fifth. Keep every story element from the reference and make sure all are clearly readable: green angkot at the halte with purple roof, the yellow guiding-block path from the halte over the zebra crossing with dropped kerbs to the building, steps beside a long gentle ramp with purple handrails and a wheelchair user going up it, an accessible toilet door with a wheelchair pictogram near the entrance, the glass lift tower on the building side, Kebun Raya style trees and the glasshouse dome behind, a small rain cloud over the mountain on the far right.

Titik pin di hero (`src/components/beranda/hero-scene.tsx`) diukur dari gambar ini. Bila gambar diganti, ukur ulang posisinya.

## rute-01 sampai rute-04

Close-up untuk bagian "Rute ke pintu" di Beranda, 960 × 960 px, dibuat 2026-10-31 dengan gambar acuan langkah 1 di atas. Setiap gambar memakai pembuka yang sama dengan langkah 2, lalu: "Square (1:1) close-up from the same place and the same style, a single focused moment, plain soft background, centred subject, generous margin", dan satu kalimat berikut.

| Berkas | Kalimat |
| --- | --- |
| `rute-01-guiding-block.webp` | A person with a white cane following the yellow guiding-block tiles (raised lines, dot warning tiles at the turn) from the purple halte toward the dropped kerb of the zebra crossing. |
| `rute-02-ramp.webp` | The long gentle ramp with purple handrails beside the entrance steps, a wheelchair user going up independently. |
| `rute-03-toilet.webp` | A clean accessible toilet room seen through its open door: wide space to turn a wheelchair, a seat toilet with fold-down grab bars, a low sink, the door with a wheelchair pictogram, violet and cream tiles. |
| `rute-04-lift.webp` | The glass lift tower with doors open at ground level, a wide cabin, a wheelchair user and an older woman in hijab about to enter, call buttons at low height, purple frame. |
