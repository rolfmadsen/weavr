export const getModelId = () => {
    if (typeof window === 'undefined') return 'demo';
    const hash = window.location.hash.replace('#', '');
    if (!hash || hash === 'model') return 'demo';
    return hash;
};
