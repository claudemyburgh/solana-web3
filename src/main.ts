import './style.css' // For TailwindCSS
import './web3'      // Import for store registration

import Alpine from 'alpinejs'
// import collapse from '@alpinejs/collapse' // Not currently used in new HTML

declare global {
    interface Window {
        Alpine: typeof import('alpinejs')
    }
}

window.Alpine = Alpine
// Alpine.plugin(collapse) // Not currently used

Alpine.start()

console.log('Alpine started and store should be registered.');
