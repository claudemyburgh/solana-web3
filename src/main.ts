import './style.css'
import './web3'

import Alpine from 'alpinejs'

import collapse from '@alpinejs/collapse'

declare global {
    interface Window {
        Alpine: typeof import('alpinejs')
    }
}

window.Alpine = Alpine
Alpine.plugin(collapse)

Alpine.start()
