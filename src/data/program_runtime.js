// Runtime program data — fetches superadmin overrides from the server and
// merges them with the baked-in defaults from programs.js / program_initiatives.js.
//
// Strategy: defaults supply the *structure* (so the dashboard never breaks
// when an override is partial), the override supplies *content* (numbers,
// labels, initiatives the superadmin actually edited).

import { PROGRAMS as DEFAULT_PROGRAMS, PROGRAM_BY_ID as DEFAULT_BY_ID } from './programs.js';
import { PROGRAM_INITIATIVES as DEFAULT_INITIATIVES } from './program_initiatives.js';

const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('amp_token')}`
});

let _cache = null;

export async function fetchProgramOverrides() {
    try {
        const res = await fetch('/api/program-overrides', { headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.warn('Falling back to bundled defaults:', e.message);
        return { programs: null, initiatives: null, updatedAt: null, updatedBy: null };
    }
}

export async function saveProgramOverrides({ programs, initiatives }) {
    const res = await fetch('/api/program-overrides', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ programs, initiatives })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    _cache = null;
    return await res.json();
}

// Merge logic: override array (if present) replaces default; otherwise default kept.
// Initiatives merge per-key with override winning.
function mergeData(overrides) {
    const programs = (overrides?.programs?.length)
        ? overrides.programs
        : DEFAULT_PROGRAMS;
    const programById = Object.fromEntries(programs.map(p => [p.id, p]));

    const initiatives = { ...DEFAULT_INITIATIVES };
    if (overrides?.initiatives && typeof overrides.initiatives === 'object') {
        for (const [id, val] of Object.entries(overrides.initiatives)) {
            initiatives[id] = val;
        }
    }
    return { programs, programById, initiatives, meta: { updatedAt: overrides?.updatedAt, updatedBy: overrides?.updatedBy } };
}

export async function loadProgramData(force = false) {
    if (!force && _cache) return _cache;
    const overrides = await fetchProgramOverrides();
    _cache = mergeData(overrides);
    return _cache;
}

export function invalidateProgramCache() {
    _cache = null;
}

// Synchronous fallback if cache is empty — used when first render happens
// before fetch resolves. Returns defaults.
export function getDefaultProgramData() {
    return {
        programs: DEFAULT_PROGRAMS,
        programById: DEFAULT_BY_ID,
        initiatives: DEFAULT_INITIATIVES,
        meta: {}
    };
}
