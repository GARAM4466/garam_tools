const TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const OWNER = 'GARAM4466';
const REPO = 'garam_tools_DB';
const BRANCH = 'main';
const PROMPTS_PATH = 'prompts.json';
const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

async function ghRequest(path, options = {}) {
    const res = await fetch(`${API_BASE}/${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `GitHub API 오류 (${res.status})`);
    }
    return res.status === 204 ? null : res.json();
}

function encodeToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

function decodeFromBase64(base64) {
    const binary = atob(base64.replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function putFile(path, base64Content, sha, message) {
    const body = { message, content: base64Content, branch: BRANCH };
    if (sha) body.sha = sha;
    return ghRequest(path, { method: 'PUT', body: JSON.stringify(body) });
}

async function readPromptsFile() {
    const data = await ghRequest(PROMPTS_PATH);
    if (!data) return { prompts: [], sha: null };
    const parsed = JSON.parse(decodeFromBase64(data.content));
    return { prompts: Array.isArray(parsed) ? parsed : [], sha: data.sha };
}

export async function fetchPrompts() {
    const { prompts } = await readPromptsFile();
    return prompts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function savePrompt(payload, editingId = null) {
    const { prompts, sha } = await readPromptsFile();
    let updated;
    if (editingId) {
        updated = prompts.map(p =>
            p.id === editingId ? { ...p, ...payload, updated_at: new Date().toISOString() } : p
        );
    } else {
        const newPrompt = {
            id: crypto.randomUUID(),
            ...payload,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        updated = [newPrompt, ...prompts];
    }
    const label = editingId ? 'update' : 'add';
    await putFile(PROMPTS_PATH, encodeToBase64(JSON.stringify(updated, null, 2)), sha, `${label}: ${payload.title}`);
}

export async function deletePrompt(id) {
    const { prompts, sha } = await readPromptsFile();
    const filtered = prompts.filter(p => p.id !== id);
    await putFile(PROMPTS_PATH, encodeToBase64(JSON.stringify(filtered, null, 2)), sha, `delete: ${id}`);
}

export async function uploadThumbnail(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const filename = `${Date.now()}.${ext}`;
    const path = `thumbnails/${filename}`;
    const base64 = await fileToBase64(file);
    await putFile(path, base64, null, `upload: ${filename}`);
    return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}`;
}

export async function deleteThumbnailByUrl(url) {
    if (!url) return;
    const prefix = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/`;
    if (!url.startsWith(prefix)) return;
    const path = url.slice(prefix.length);
    const data = await ghRequest(path);
    if (!data) return;
    const body = { message: `delete: ${path}`, sha: data.sha, branch: BRANCH };
    await ghRequest(path, { method: 'DELETE', body: JSON.stringify(body) }).catch(() => {});
}
