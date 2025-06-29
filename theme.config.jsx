import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'
import { Logo } from '@/components/logo' // Reutilizando o logo que já temos

const config: DocsThemeConfig = {
    logo: <Logo />,
    project: {
        link: 'https://github.com/rbxyz/buzz-saas',
    },
    chat: {
        link: 'https://discord.com', // Exemplo
    },
    docsRepositoryBase: 'https://github.com/rbxyz/buzz-saas/tree/main/docs-portal',
    footer: {
        text: 'Buzz SaaS Documentation',
    },
}

export default config 