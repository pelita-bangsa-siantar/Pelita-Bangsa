/* Token desain "Lentera Edukasi Komunitas" — disalin dari blok tailwind-config Stitch (design/stitch). Dimuat SETELAH CDN Tailwind. */
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'on-primary-container': '#fffbff', 'on-surface': '#111c2d', 'inverse-primary': '#ffb77d', 'surface-tint': '#904d00',
        'surface-container-high': '#dee8ff', 'outline-variant': '#dbc2b0', 'surface-container-low': '#f0f3ff',
        'on-tertiary-fixed': '#40000c', 'on-secondary-container': '#00476e', 'on-error': '#ffffff', 'surface-bright': '#f9f9ff',
        'secondary-fixed-dim': '#93ccff', 'on-tertiary-container': '#fffbff', 'secondary-container': '#5bb8fe',
        'on-primary-fixed-variant': '#6e3900', 'surface-dim': '#cfdaf2', 'on-tertiary': '#ffffff', 'on-surface-variant': '#554336',
        'on-background': '#111c2d', 'secondary-fixed': '#cce5ff', 'primary': '#8d4b00', 'primary-container': '#b15f00',
        'tertiary-fixed-dim': '#ffb3b6', 'primary-fixed': '#ffdcc3', 'error': '#ba1a1a', 'primary-fixed-dim': '#ffb77d',
        'on-secondary': '#ffffff', 'inverse-on-surface': '#ecf1ff', 'inverse-surface': '#263143', 'background': '#f9f9ff',
        'outline': '#887364', 'surface-container-highest': '#d8e3fb', 'tertiary-container': '#e21e49',
        'surface-container-lowest': '#ffffff', 'on-primary-fixed': '#2f1500', 'tertiary': '#ba0035', 'error-container': '#ffdad6',
        'on-secondary-fixed': '#001d31', 'on-tertiary-fixed-variant': '#920028', 'on-error-container': '#93000a',
        'tertiary-fixed': '#ffdada', 'surface': '#f9f9ff', 'surface-variant': '#d8e3fb', 'on-secondary-fixed-variant': '#004b73',
        'on-primary': '#ffffff', 'surface-container': '#e7eeff', 'secondary': '#006398'
      },
      borderRadius: { DEFAULT: '0.25rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
      spacing: { 'space-xs': '0.25rem', 'space-sm': '0.5rem', 'space-md': '1rem', 'space-lg': '1.5rem', 'space-xl': '2.5rem', gutter: '1.25rem', margin: '1.5rem' },
      fontFamily: {
        'label-lg': ['Plus Jakarta Sans'], 'headline-xl-mobile': ['Plus Jakarta Sans'], 'body-lg': ['Plus Jakarta Sans'],
        'headline-sm': ['Plus Jakarta Sans'], 'headline-lg': ['Plus Jakarta Sans'], 'body-md': ['Plus Jakarta Sans'],
        'label-sm': ['Plus Jakarta Sans'], 'body-sm': ['Plus Jakarta Sans'], 'headline-md': ['Plus Jakarta Sans'],
        'label-md': ['Plus Jakarta Sans'], 'display-lg': ['Plus Jakarta Sans'], 'display-lg-mobile': ['Plus Jakarta Sans'],
        'headline-xl': ['Plus Jakarta Sans'], sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif']
      },
      fontSize: {
        'label-lg': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'headline-xl-mobile': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'headline-sm': ['18px', { lineHeight: '26px', fontWeight: '600' }],
        'headline-lg': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label-sm': ['11px', { lineHeight: '14px', fontWeight: '700' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'headline-md': ['22px', { lineHeight: '30px', fontWeight: '600' }],
        'label-md': ['12px', { lineHeight: '16px', fontWeight: '600' }],
        'display-lg': ['48px', { lineHeight: '56px', fontWeight: '800' }],
        'display-lg-mobile': ['34px', { lineHeight: '42px', fontWeight: '800' }],
        'headline-xl': ['36px', { lineHeight: '44px', fontWeight: '700' }]
      }
    }
  }
};
