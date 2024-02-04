import I18n from '@/shared/i18n/I18n'

export async function changeLanguageWrapper(lang) {
    I18n.setLocale(lang)
    await window.api.callStatic('I18n', 'setLocale', lang)
    await window.api.callStatic('TrayManage', 'updateContextMenu')
}
