<script lang="ts">
    import { untrack } from "svelte";
    import type { Project, ProjectLimits } from "$lib/types";
    import { PROJECT_COLORS, getRandomProjectColor } from "$lib/helpers/colors";
    import Select from "$lib/components/select.svelte";
    import ProjectLimit from "./project-limit.svelte";

    export interface ProjectFormExtras {
        color: string;
        hourlyRate: number | null;
        currency: string | null;
    }

    type Props = {
        project?: Project;
        name: string;
        currentColor?: string;
        onsave: (name: string, limits: ProjectLimits, extras: ProjectFormExtras) => void;
        oncancel: () => void;
    };

    let { project, name = $bindable(""), currentColor, onsave, oncancel }: Props = $props();

    const CURRENCIES = [
        { value: "USD", symbol: "$", name: "US Dollar" },
        { value: "EUR", symbol: "€", name: "Euro" },
        { value: "GBP", symbol: "£", name: "British Pound" },
        { value: "JPY", symbol: "¥", name: "Japanese Yen" },
        { value: "CNY", symbol: "¥", name: "Chinese Yuan" },
        { value: "CAD", symbol: "$", name: "Canadian Dollar" },
        { value: "AUD", symbol: "$", name: "Australian Dollar" },
        { value: "NZD", symbol: "$", name: "New Zealand Dollar" },
        { value: "CHF", symbol: "CHF", name: "Swiss Franc" },
        { value: "SGD", symbol: "$", name: "Singapore Dollar" },
        { value: "HKD", symbol: "$", name: "Hong Kong Dollar" },
        { value: "TWD", symbol: "NT$", name: "Taiwan Dollar" },
        { value: "INR", symbol: "₹", name: "Indian Rupee" },
        { value: "KRW", symbol: "₩", name: "South Korean Won" },
        { value: "KPW", symbol: "₩", name: "North Korean Won" },
        { value: "PHP", symbol: "₱", name: "Philippine Peso" },
        { value: "VND", symbol: "₫", name: "Vietnamese Dong" },
        { value: "LAK", symbol: "₭", name: "Lao Kip" },
        { value: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
        { value: "PKR", symbol: "₨", name: "Pakistani Rupee" },
        { value: "LKR", symbol: "Rs", name: "Sri Lankan Rupee" },
        { value: "NPR", symbol: "₨", name: "Nepalese Rupee" },
        { value: "THB", symbol: "฿", name: "Thai Baht" },
        { value: "KHR", symbol: "៛", name: "Cambodian Riel" },
        { value: "MNT", symbol: "₮", name: "Mongolian Tögrög" },
        { value: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
        { value: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
        { value: "MMK", symbol: "K", name: "Myanmar Kyat" },
        { value: "BND", symbol: "$", name: "Brunei Dollar" },
        { value: "MOP", symbol: "MOP$", name: "Macanese Pataca" },
        { value: "MVR", symbol: "Rf", name: "Maldivian Rufiyaa" },
        { value: "BTN", symbol: "Nu.", name: "Bhutanese Ngultrum" },
        { value: "AFN", symbol: "؋", name: "Afghan Afghani" },
        { value: "KZT", symbol: "₸", name: "Kazakhstani Tenge" },
        { value: "UZS", symbol: "soʻm", name: "Uzbekistani Som" },
        { value: "KGS", symbol: "с", name: "Kyrgyzstani Som" },
        { value: "TJS", symbol: "ЅМ", name: "Tajikistani Somoni" },
        { value: "TMT", symbol: "m", name: "Turkmenistani Manat" },
        { value: "SAR", symbol: "﷼", name: "Saudi Riyal" },
        { value: "IRR", symbol: "﷼", name: "Iranian Rial" },
        { value: "QAR", symbol: "﷼", name: "Qatari Riyal" },
        { value: "OMR", symbol: "﷼", name: "Omani Rial" },
        { value: "YER", symbol: "﷼", name: "Yemeni Rial" },
        { value: "AED", symbol: "د.إ", name: "UAE Dirham" },
        { value: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar" },
        { value: "BHD", symbol: ".د.ب", name: "Bahraini Dinar" },
        { value: "JOD", symbol: "د.ا", name: "Jordanian Dinar" },
        { value: "IQD", symbol: "ع.د", name: "Iraqi Dinar" },
        { value: "LBP", symbol: "ل.ل", name: "Lebanese Pound" },
        { value: "SYP", symbol: "£", name: "Syrian Pound" },
        { value: "ILS", symbol: "₪", name: "Israeli Shekel" },
        { value: "RUB", symbol: "₽", name: "Russian Ruble" },
        { value: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
        { value: "TRY", symbol: "₺", name: "Turkish Lira" },
        { value: "GEL", symbol: "₾", name: "Georgian Lari" },
        { value: "AZN", symbol: "₼", name: "Azerbaijani Manat" },
        { value: "AMD", symbol: "֏", name: "Armenian Dram" },
        { value: "BYN", symbol: "Br", name: "Belarusian Ruble" },
        { value: "MDL", symbol: "L", name: "Moldovan Leu" },
        { value: "CZK", symbol: "Kč", name: "Czech Koruna" },
        { value: "PLN", symbol: "zł", name: "Polish Złoty" },
        { value: "HUF", symbol: "Ft", name: "Hungarian Forint" },
        { value: "RON", symbol: "lei", name: "Romanian Leu" },
        { value: "BGN", symbol: "лв", name: "Bulgarian Lev" },
        { value: "RSD", symbol: "дин.", name: "Serbian Dinar" },
        { value: "MKD", symbol: "ден", name: "Macedonian Denar" },
        { value: "ALL", symbol: "L", name: "Albanian Lek" },
        { value: "BAM", symbol: "KM", name: "Bosnia-Herzegovina Mark" },
        { value: "HRK", symbol: "kn", name: "Croatian Kuna" },
        { value: "DKK", symbol: "kr", name: "Danish Krone" },
        { value: "NOK", symbol: "kr", name: "Norwegian Krone" },
        { value: "SEK", symbol: "kr", name: "Swedish Krona" },
        { value: "ISK", symbol: "kr", name: "Icelandic Króna" },
        { value: "NGN", symbol: "₦", name: "Nigerian Naira" },
        { value: "GHS", symbol: "₵", name: "Ghanaian Cedi" },
        { value: "ZAR", symbol: "R", name: "South African Rand" },
        { value: "EGP", symbol: "£", name: "Egyptian Pound" },
        { value: "KES", symbol: "KSh", name: "Kenyan Shilling" },
        { value: "TZS", symbol: "TSh", name: "Tanzanian Shilling" },
        { value: "UGX", symbol: "USh", name: "Ugandan Shilling" },
        { value: "ETB", symbol: "Br", name: "Ethiopian Birr" },
        { value: "MAD", symbol: "د.م.", name: "Moroccan Dirham" },
        { value: "DZD", symbol: "د.ج", name: "Algerian Dinar" },
        { value: "TND", symbol: "د.ت", name: "Tunisian Dinar" },
        { value: "LYD", symbol: "ل.د", name: "Libyan Dinar" },
        { value: "SDG", symbol: "ج.س.", name: "Sudanese Pound" },
        { value: "XOF", symbol: "CFA", name: "West African CFA Franc" },
        { value: "XAF", symbol: "FCFA", name: "Central African CFA Franc" },
        { value: "RWF", symbol: "FRw", name: "Rwandan Franc" },
        { value: "BIF", symbol: "FBu", name: "Burundian Franc" },
        { value: "CDF", symbol: "FC", name: "Congolese Franc" },
        { value: "ZMW", symbol: "ZK", name: "Zambian Kwacha" },
        { value: "MWK", symbol: "MK", name: "Malawian Kwacha" },
        { value: "MZN", symbol: "MT", name: "Mozambican Metical" },
        { value: "BWP", symbol: "P", name: "Botswana Pula" },
        { value: "NAD", symbol: "$", name: "Namibian Dollar" },
        { value: "SZL", symbol: "L", name: "Eswatini Lilangeni" },
        { value: "LSL", symbol: "L", name: "Lesotho Loti" },
        { value: "MUR", symbol: "₨", name: "Mauritian Rupee" },
        { value: "SCR", symbol: "₨", name: "Seychellois Rupee" },
        { value: "MGA", symbol: "Ar", name: "Malagasy Ariary" },
        { value: "AOA", symbol: "Kz", name: "Angolan Kwanza" },
        { value: "GMD", symbol: "D", name: "Gambian Dalasi" },
        { value: "GNF", symbol: "FG", name: "Guinean Franc" },
        { value: "SLL", symbol: "Le", name: "Sierra Leonean Leone" },
        { value: "LRD", symbol: "$", name: "Liberian Dollar" },
        { value: "CVE", symbol: "$", name: "Cape Verdean Escudo" },
        { value: "MXN", symbol: "$", name: "Mexican Peso" },
        { value: "BRL", symbol: "R$", name: "Brazilian Real" },
        { value: "ARS", symbol: "$", name: "Argentine Peso" },
        { value: "CLP", symbol: "$", name: "Chilean Peso" },
        { value: "COP", symbol: "$", name: "Colombian Peso" },
        { value: "PEN", symbol: "S/", name: "Peruvian Sol" },
        { value: "UYU", symbol: "$U", name: "Uruguayan Peso" },
        { value: "PYG", symbol: "₲", name: "Paraguayan Guaraní" },
        { value: "BOB", symbol: "Bs.", name: "Bolivian Boliviano" },
        { value: "VES", symbol: "Bs.", name: "Venezuelan Bolívar" },
        { value: "GYD", symbol: "$", name: "Guyanese Dollar" },
        { value: "SRD", symbol: "$", name: "Surinamese Dollar" },
        { value: "CRC", symbol: "₡", name: "Costa Rican Colón" },
        { value: "GTQ", symbol: "Q", name: "Guatemalan Quetzal" },
        { value: "HNL", symbol: "L", name: "Honduran Lempira" },
        { value: "NIO", symbol: "C$", name: "Nicaraguan Córdoba" },
        { value: "PAB", symbol: "B/.", name: "Panamanian Balboa" },
        { value: "DOP", symbol: "RD$", name: "Dominican Peso" },
        { value: "CUP", symbol: "₱", name: "Cuban Peso" },
        { value: "HTG", symbol: "G", name: "Haitian Gourde" },
        { value: "JMD", symbol: "J$", name: "Jamaican Dollar" },
        { value: "TTD", symbol: "TT$", name: "Trinidad & Tobago Dollar" },
        { value: "BBD", symbol: "$", name: "Barbadian Dollar" },
        { value: "BSD", symbol: "$", name: "Bahamian Dollar" },
        { value: "BZD", symbol: "BZ$", name: "Belize Dollar" },
        { value: "XCD", symbol: "$", name: "East Caribbean Dollar" },
        { value: "FJD", symbol: "$", name: "Fijian Dollar" },
        { value: "PGK", symbol: "K", name: "Papua New Guinean Kina" },
        { value: "SBD", symbol: "$", name: "Solomon Islands Dollar" },
        { value: "VUV", symbol: "VT", name: "Vanuatu Vatu" },
        { value: "WST", symbol: "T", name: "Samoan Tala" },
        { value: "TOP", symbol: "T$", name: "Tongan Paʻanga" }
    ];

    let isEdit: boolean = $derived(!!project);
    let color: string = $state(untrack(() =>
        project ? (project.color ?? currentColor ?? getRandomProjectColor())
                : getRandomProjectColor()
    ));
    let pickerOpen: boolean = $state(false);
    let hourlyRate: string = $state(untrack(() =>
        project?.hourly_rate != null ? String(project.hourly_rate) : ""
    ));
    let currency: string = $state(untrack(() => project?.currency ?? ""));

    const currencyOptions = CURRENCIES.map(c => ({
        value: c.value,
        label: `${c.value} (${c.symbol})`,
    }));

    function secToHms(s: number | null): string {
        if (!s) return '00:00:00';
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    function hmsToSec(v: string): number | null {
        const [h, m, s] = v.split(':').map(Number);
        const total = h * 3600 + m * 60 + s;
        return total || null;
    }

    let maxEnabled: boolean = $state(untrack(() => project?.max_daily_enabled ?? false));
    let notifyEnabled: boolean = $state(untrack(() => project?.max_weekly_enabled ?? false));
    let maxDaily: string = $state(untrack(() => secToHms(project?.max_daily ?? null)));
    let maxWeekly: string = $state(untrack(() => secToHms(project?.max_weekly ?? null)));
    let notifyDaily: string = $state(untrack(() => secToHms(project?.max_daily_alert ?? null)));
    let notifyWeekly: string = $state(untrack(() => secToHms(project?.max_weekly_alert ?? null)));

    function buildLimits(): ProjectLimits {
        return {
            maxDaily: maxEnabled ? hmsToSec(maxDaily) : null,
            maxDailyAlert: notifyEnabled ? hmsToSec(notifyDaily) : null,
            maxWeekly: maxEnabled ? hmsToSec(maxWeekly) : null,
            maxWeeklyAlert: notifyEnabled ? hmsToSec(notifyWeekly) : null,
            maxDailyEnabled: maxEnabled,
            maxWeeklyEnabled: notifyEnabled,
        };
    }

    function parseRate(v: string): number | null {
        const trimmed = v.trim();
        if (!trimmed) return null;
        const n = parseFloat(trimmed);
        return Number.isFinite(n) && n >= 0 ? n : null;
    }

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        const rate = parseRate(hourlyRate);
        onsave(trimmed, buildLimits(), {
            color,
            hourlyRate: rate,
            currency: rate != null ? (currency || null) : null,
        });
    }
</script>

<!--
    @component
    Form for adding or editing a project with optional timer limits.

    @param {Project} [project] - Project to edit. Omit for add mode.
    @param {string} name - Bindable project name.
    @param {(name: string, limits: ProjectLimits) => void} onsave - Callback with name and limits on save.
    @param {() => void} oncancel - Callback when the form is cancelled.
-->
<section>
    <p class="title">{isEdit ? "Edit" : "New"} Project</p>
    <form id="project-form" onsubmit={handleSubmit}>
        <div class="name-row">
            <button
                type="button"
                class="color-trigger"
                title="Project color"
                style="background-color: {color};"
                aria-label="Pick project color"
                aria-haspopup="listbox"
                aria-expanded={pickerOpen}
                onclick={() => (pickerOpen = !pickerOpen)}
            ></button>
            <input
                type="text"
                name="pr-name"
                placeholder="title"
                maxlength="30"
                bind:value={name}
                onkeydown={(e: KeyboardEvent) => {
                    if (e.key === "Escape") oncancel();
                }}
            />
            {#if pickerOpen}
                <ul class="swatches" role="listbox" aria-label="Color presets">
                    {#each PROJECT_COLORS as preset (preset)}
                        <li>
                            <button
                                type="button"
                                class="swatch"
                                class:selected={color === preset}
                                style="background-color: {preset};"
                                aria-label={preset}
                                aria-selected={color === preset}
                                role="option"
                                onclick={() => { color = preset; pickerOpen = false; }}
                            ></button>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
        <ProjectLimit
            bind:maxEnabled
            bind:notifyEnabled
            bind:maxDaily
            bind:maxWeekly
            bind:notifyDaily
            bind:notifyWeekly
        />
        <div class="rate-row">
            <label for="rate-currency">Hourly rate</label>

            <div class="rate-form">
                <input
                    id="rate-currency"
                    type="text"
                    inputmode="decimal"
                    name="pr-rate"
                    placeholder="0.00"
                    bind:value={hourlyRate}
                    oninput={(e: Event) => {
                        const el = e.currentTarget as HTMLInputElement;
                        // keep digits and at most one decimal point
                        let cleaned = el.value.replace(/[^0-9.]/g, "");
                        const firstDot = cleaned.indexOf(".");
                        if (firstDot !== -1) {
                            cleaned = cleaned.slice(0, firstDot + 1)
                                + cleaned.slice(firstDot + 1).replace(/\./g, "");
                        }
                        if (cleaned !== el.value) el.value = cleaned;
                        hourlyRate = cleaned;
                    }}
                />
                <div class="currency">
                    <Select
                        options={currencyOptions}
                        bind:value={currency}
                        placeholder="Currency"
                        size="md"
                        nullable
                    />
                </div>
            </div>
        </div>
    </form>
</section>

<style>
    p {
        font-size: 16px;
        font-weight: 500;
        color: var(--gray-10);
        margin-bottom: 5px;
    }

    p.title {
        font-size: 0.875rem;
        color: var(--yellow);
        margin-top: 0;
        margin-bottom: 0.75rem;
    }

    form input {
        width: 100%;
        padding: 6px;
        border: 1px solid var(--gray-70);
        border-radius: 4px;
        background-color: var(--gray-90);
        box-sizing: border-box;
        color: var(--gray-10);
        font-size: 0.9rem;
        font-weight: 300;
        outline: none;
    }

    form input::placeholder {
        color: var(--gray-40);
    }

    form input:focus {
        border-color: var(--gray-60);
    }

    .name-row {
        position: relative;
        display: flex;
        align-items: stretch;
        gap: 0.4rem;
    }

    .name-row input {
        flex: 1;
    }

    .color-trigger {
        width: 30px;
        height: auto;
        min-height: 28px;
        border: 1px solid var(--gray-70);
        border-radius: 4px;
        padding: 0;
        cursor: pointer;
        transition: filter 0.15s ease;
    }

    .color-trigger:hover {
        filter: brightness(1.15);
    }

    .swatches {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        z-index: 5;
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 0.3rem;
        margin: 0;
        padding: 0.4rem;
        list-style: none;
        background-color: var(--gray-90);
        border: 1px solid var(--gray-70);
        border-radius: 4px;
    }

    .swatch {
        width: 20px;
        height: 20px;
        border: 1px solid transparent;
        border-radius: 4px;
        padding: 0;
        cursor: pointer;
        transition: transform 0.1s ease, border-color 0.1s ease;
    }

    .swatch:hover {
        transform: scale(1.08);
    }

    .swatch.selected {
        border-color: var(--gray-10);
    }

    .rate-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.4rem;
        margin-top: 2rem;
    }

    .rate-row label {
        color: var(--gray-30);
        font-weight: 300;
        font-size: 0.9rem;
        flex-shrink: 0;
    }

    .rate-form {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.4rem;
    }

    .rate-form input {
        width: 80px;
    }

    .rate-form .currency {
        width: 150px;
        flex-shrink: 0;
    }
</style>
