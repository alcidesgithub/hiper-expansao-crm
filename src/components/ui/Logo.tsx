import React from 'react';

interface LogoProps {
    className?: string;
    /** Height in pixels – width auto-scales */
    height?: number;
}

/**
 * Rede Hiperfarma logo component.
 * Uses the actual logo image from /logo-cor.png
 */
export function Logo({ className = '', height = 40 }: LogoProps) {
    return (
        <img
            src="/logo-cor.png"
            alt="Rede Hiperfarma"
            height={height}
            className={className}
            style={{ height, width: 'auto' }}
        />
    );
}
