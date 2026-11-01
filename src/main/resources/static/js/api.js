// The only place that talks to the backend. All prices come from the Java FeeCalculator.

export async function fetchFee(entry, at) {
    const params = new URLSearchParams({ entry, at });
    const response = await fetch(`/api/fee?${params}`);
    if (!response.ok) {
        throw new Error(`fee request failed: ${response.status}`);
    }
    return response.json();
}

export async function checkout(entry, exit) {
    const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry, exit }),
    });
    if (!response.ok) {
        throw new Error(`checkout failed: ${response.status}`);
    }
    return response.json();
}
