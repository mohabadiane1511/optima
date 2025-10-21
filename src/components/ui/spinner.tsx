import React from 'react';

type SpinnerProps = {
    className?: string;
    size?: number; // pixels
};

export function Spinner({ className = '', size = 16 }: SpinnerProps) {
    const s = size;
    return (
        <span
            aria-label="loading"
            className={`inline-block align-middle animate-spin rounded-full border-2 border-gray-300 border-t-transparent ${className}`}
            style={{ width: s, height: s }}
        />
    );
}


