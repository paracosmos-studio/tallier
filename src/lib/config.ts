// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

const utmString = "?utm_source=application&utm_medium=settings";

export const settings = {
    releaseYear: 2026,
    api: import.meta.env.DEV ? "http://localhost:9999" : "https://api.tallier.app",
    urls: {
        homepage: "https://tallier.app" + utmString,
        paracosmos: "https://paracosmos.studio" + utmString,
        privacy: "https://tallier.app/privacy" + utmString,
        terms: "https://tallier.app/terms" + utmString,
        feedback: "https://github.com/paracosmos-studio/tallier/issues/new/choose",
        contribute: "https://tallier.app/contribute" + utmString,
        license: "https://github.com/paracosmos-studio/tallier/blob/main/LICENSE" + utmString,
        github: "https://github.com/paracosmos-studio/tallier" + utmString,
    }
}