import path from 'node:path';

// Build-time composition only: fragments share the template's private IIFE.
// No eval, remote imports, runtime dependency, or source execution is involved.
export function assemble(entry, { read, values = {} }) {
    const included = new Set();
    function expand(file, stack = []) {
        const name = path.posix.normalize(file);
        if (name.startsWith('../') || name.startsWith('/') || name.includes(':') || name.includes('\\')) {
            throw new Error(`Invalid source path: ${file}`);
        }
        if (stack.includes(name)) throw new Error(`Circular include: ${[...stack, name].join(' -> ')}`);
        if (included.has(name)) throw new Error(`Duplicate include: ${name}`);
        included.add(name);
        return read(name).replace(/\/\* @include ([^\r\n]+?) \*\/\r?\n?/g,
            (_match, child) => expand(child, [...stack, name]));
    }
    let source = expand(entry);
    for (const [token, value] of Object.entries(values)) {
        if (!source.includes(token)) throw new Error(`Missing build token: ${token}`);
        // A callback preserves literal replacement patterns such as $& and $'.
        source = source.replaceAll(token, () => String(value));
    }
    return source;
}
