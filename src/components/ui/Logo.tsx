import React from 'react';
import Image from 'next/image';

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
    const width = Math.round((300 / 73) * height);

    return (
        <Image
            src="/logo-cor.webp"
            alt="Rede Hiperfarma"
            width={width}
            height={height}
            className={className}
            style={{ height, width: 'auto' }}
        />
    );
}
