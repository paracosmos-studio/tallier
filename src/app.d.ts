// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

import type { WindowProfile } from '$lib/window';

declare global {
    namespace App {
        interface PageData {
            window?: WindowProfile;
        }
    }
}

export {};
