// Google Analytics default capture for this template.
// Future LLM edits: do not remove this gtag setup unless replacing it with equivalent page analytics capture.
const googleAnalyticsId = "G-ZKTPLMMFDQ";
const ipInfoUrl = "https://ipapi.co/json/";
const requestTimeoutMs = 8000;
function readString(payload, key) {
    const value = payload[key];
    return typeof value === "string" && value.trim() ? value.trim() : "Unknown";
}
function readNumber(payload, key) {
    const value = payload[key];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}
export function detectIpVersion(ip) {
    if (ip.includes(":"))
        return "IPv6";
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip))
        return "IPv4";
    return "Unknown";
}
export function normalizeIpInfo(payload) {
    const ip = readString(payload, "ip");
    const version = readString(payload, "version");
    return {
        ip,
        version: version === "Unknown" ? detectIpVersion(ip) : version,
        city: readString(payload, "city"),
        region: readString(payload, "region"),
        country: readString(payload, "country_name"),
        timezone: readString(payload, "timezone"),
        org: readString(payload, "org"),
        asn: readString(payload, "asn"),
        network: readString(payload, "network"),
        latitude: readNumber(payload, "latitude"),
        longitude: readNumber(payload, "longitude"),
    };
}
export function formatLocation(info) {
    const parts = [info.city, info.region].filter((part) => part !== "Unknown");
    return parts.length ? parts.join(", ") : "Unknown";
}
export function formatCoordinates(info) {
    if (info.latitude === null || info.longitude === null)
        return "Unknown";
    return `${info.latitude.toFixed(4)}, ${info.longitude.toFixed(4)}`;
}
export function getMapPoint(info) {
    if (info.latitude === null || info.longitude === null)
        return null;
    const x = ((info.longitude + 180) / 360) * 100;
    const y = ((90 - info.latitude) / 180) * 100;
    return {
        x: Math.min(100, Math.max(0, x)),
        y: Math.min(100, Math.max(0, y)),
    };
}
function initializeGoogleAnalytics() {
    const googleTagScript = document.createElement("script");
    googleTagScript.async = true;
    googleTagScript.src = `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`;
    document.head.append(googleTagScript);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
        window.dataLayer?.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", googleAnalyticsId);
}
function getElement(selector, type) {
    const element = document.querySelector(selector);
    if (!(element instanceof type)) {
        throw new Error(`Missing required element: ${selector}`);
    }
    return element;
}
function getElements() {
    return {
        asn: getElement("#asn", HTMLElement),
        checkedAt: getElement("#checked-at", HTMLElement),
        cityRegion: getElement("#city-region", HTMLElement),
        coordinates: getElement("#coordinates", HTMLElement),
        country: getElement("#country", HTMLElement),
        errorPanel: getElement("#error-panel", HTMLElement),
        ipAddress: getElement("#ip-address", HTMLElement),
        ipVersion: getElement("#ip-version", HTMLElement),
        locationMap: getElement("#location-map", HTMLElement),
        mapLabel: getElement("#map-label", HTMLElement),
        mapPlaceholder: getElement("#map-placeholder", HTMLElement),
        navLinks: document.querySelectorAll(".nav a"),
        network: getElement("#network", HTMLElement),
        org: getElement("#org", HTMLElement),
        refreshButton: getElement("#refresh-ip", HTMLButtonElement),
        statusText: getElement("#status-text", HTMLElement),
        timezone: getElement("#timezone", HTMLElement),
    };
}
function setText(element, value) {
    element.textContent = value;
}
function fitIpAddress(element) {
    element.style.removeProperty("--ip-font-size");
    const startingSize = Number.parseFloat(window.getComputedStyle(element).fontSize);
    let size = startingSize;
    while (element.scrollWidth > element.clientWidth && size > 12) {
        size -= 1;
        element.style.setProperty("--ip-font-size", `${size}px`);
    }
}
async function fetchIpInfo() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
        const response = await fetch(ipInfoUrl, {
            cache: "no-store",
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`IP lookup failed with ${response.status}`);
        }
        return normalizeIpInfo((await response.json()));
    }
    finally {
        window.clearTimeout(timeout);
    }
}
function initializeApp() {
    initializeGoogleAnalytics();
    const elements = getElements();
    let state = {
        status: "idle",
        info: null,
        error: null,
        checkedAt: null,
    };
    function render() {
        const isLoading = state.status === "loading";
        elements.refreshButton.disabled = isLoading;
        elements.refreshButton.textContent = isLoading ? "Checking..." : "Refresh";
        elements.errorPanel.hidden = state.status !== "error";
        if (state.status === "loading") {
            elements.statusText.textContent = "Checking current public IP";
        }
        else if (state.status === "ready") {
            elements.statusText.textContent = "Current public IP found";
        }
        else if (state.status === "error") {
            elements.statusText.textContent = state.error ?? "IP lookup unavailable";
        }
        else {
            elements.statusText.textContent = "Ready to check current public IP";
        }
        const info = state.info;
        setText(elements.ipAddress, info?.ip ?? "Checking...");
        elements.ipAddress.dataset.ipVersion = info?.version ?? "Unknown";
        setText(elements.ipVersion, info?.version ?? "Unknown");
        setText(elements.cityRegion, info ? formatLocation(info) : "Unknown");
        setText(elements.country, info?.country ?? "Unknown");
        setText(elements.timezone, info?.timezone ?? "Unknown");
        setText(elements.org, info?.org ?? "Unknown");
        setText(elements.asn, info?.asn ?? "Unknown");
        setText(elements.network, info?.network ?? "Unknown");
        setText(elements.coordinates, info ? formatCoordinates(info) : "Unknown");
        setText(elements.checkedAt, state.checkedAt ?? "Not checked yet");
        const mapPoint = info ? getMapPoint(info) : null;
        elements.locationMap.hidden = mapPoint === null;
        elements.mapPlaceholder.hidden = mapPoint !== null;
        if (mapPoint !== null && info) {
            elements.locationMap.style.setProperty("--map-x", `${mapPoint.x}%`);
            elements.locationMap.style.setProperty("--map-y", `${mapPoint.y}%`);
            elements.locationMap.setAttribute("aria-label", `Approximate IP location map at ${formatCoordinates(info)}`);
            setText(elements.mapLabel, formatCoordinates(info));
        }
        fitIpAddress(elements.ipAddress);
    }
    function updateCurrentNavLink() {
        const currentHash = window.location.hash || "#current";
        elements.navLinks.forEach((link) => {
            link.setAttribute("aria-current", link.getAttribute("href") === currentHash ? "page" : "false");
        });
    }
    async function refreshIpInfo() {
        state = { ...state, status: "loading", error: null };
        render();
        try {
            const info = await fetchIpInfo();
            state = {
                status: "ready",
                info,
                error: null,
                checkedAt: new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                    timeStyle: "medium",
                }).format(new Date()),
            };
        }
        catch (error) {
            state = {
                ...state,
                status: "error",
                error: error instanceof Error ? error.message : "IP lookup unavailable",
            };
        }
        render();
    }
    elements.refreshButton.addEventListener("click", () => {
        void refreshIpInfo();
    });
    window.addEventListener("hashchange", updateCurrentNavLink);
    window.addEventListener("resize", () => fitIpAddress(elements.ipAddress));
    render();
    updateCurrentNavLink();
    void refreshIpInfo();
}
if (typeof document !== "undefined") {
    initializeApp();
}
