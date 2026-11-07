import type { Metadata } from "next";
import { BRAND, BUSINESS } from "@/lib/brand";

export const metadata: Metadata = { title: "Open-source licences" };

// What's in the engine, as built by ffmpeg.wasm v0.12.10 (its Dockerfile). Keep in step with @ffmpeg/core in package.json.
const PARTS = [
  ["FFmpeg 5.1.4", "GPL 2 or later (as built here)", "https://ffmpeg.org"],
  ["x264", "GPL 2 or later", "https://www.videolan.org/developers/x264.html"],
  ["x265 3.4", "GPL 2 or later", "https://www.x265.org"],
  ["libass 0.15.0", "ISC", "https://github.com/libass/libass"],
  ["FreeType 2.10.4", "FreeType License", "https://freetype.org"],
  ["FriBidi 1.0.9", "LGPL 2.1 or later", "https://github.com/fribidi/fribidi"],
  ["HarfBuzz 5.2.0", "MIT-style", "https://harfbuzz.github.io"],
  ["zimg 3.0.5", "WTFPL", "https://github.com/sekrit-twc/zimg"],
  ["libvpx 1.13.1", "BSD 3-Clause", "https://www.webmproject.org"],
  ["LAME", "LGPL 2 or later", "https://lame.sourceforge.io"],
  ["libogg 1.3.4, libvorbis 1.3.3, libtheora 1.1.1", "BSD-style", "https://xiph.org"],
  ["Opus 1.3.1", "BSD 3-Clause", "https://opus-codec.org"],
  ["libwebp 1.3.2", "BSD 3-Clause", "https://chromium.googlesource.com/webm/libwebp"],
  ["zlib 1.2.11", "zlib License", "https://zlib.net"],
  ["ffmpeg.wasm 0.12", "GPL 2 or later (core), MIT (loader)", "https://github.com/ffmpegwasm/ffmpeg.wasm"],
] as const;

export default function Page() {
  return (
    <article>
      <h1>Open-source licences</h1>
      <p className="updated">Last updated {BUSINESS.updated}</p>

      <p>
        {BRAND.name} makes videos on your own device with a video engine built from the free software below. The website sends this
        engine to your browser, and the Adobe panel carries a copy of it. {BRAND.name} didn&apos;t write this software, and its
        authors keep their copyright.
      </p>

      <h2>Your rights</h2>
      <p>
        The engine is licensed under the <a href="/licences/GPL-2.0.txt">GNU General Public License, version 2 or later</a>. You may
        use, study, change and share it under that licence. It comes with no warranty. Nothing in our{" "}
        <a href="/terms">Terms</a> limits these rights.
      </p>

      <h2>Source code</h2>
      <p>
        <a href="/api/licences/source">Download the engine&apos;s full source code</a> (about 70 MB). It holds every part below and the
        instructions used to build them. {BRAND.name} hasn&apos;t changed any of it. If you can&apos;t download it, write to{" "}
        <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> and we&apos;ll get you a copy.
      </p>

      <h2>What&apos;s in the engine</h2>
      <ul>
        {PARTS.map(([name, licence, url]) => <li key={name}><a href={url} target="_blank" rel="noreferrer">{name}</a>: {licence}</li>)}
      </ul>

      <h2>Fonts</h2>
      <p>The caption fonts have <a href="/caption-fonts/LICENSES.txt">their own licences</a>.</p>
    </article>
  );
}
