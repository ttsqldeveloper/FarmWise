import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const resources = {
    en: {
        translation: {
            welcome: "Welcome to FarmWise",
            dashboard: "Dashboard",
            advice: "Farming Advice",
            reminders: "Reminders",
            community: "Community Forum",
            market: "Market Prices",
            analytics: "Analytics",
            language: "Language",
            logout: "Logout",
            settings: "Settings",
            profile: "Profile",
            notifications: "Notifications",
            // Add more translations...
        }
    },
    sw: {
        translation: {
            welcome: "Karibu FarmWise",
            dashboard: "Dashibodi",
            advice: "Ushauri wa Kilimo",
            reminders: "Vikumbusho",
            community: "Jukwaa la Jamii",
            market: "Bei za Soko",
            analytics: "Uchambuzi",
            language: "Lugha",
            logout: "Toka",
            settings: "Mipangilio",
            profile: "Wasifu",
            notifications: "Arifa",
        }
    },
    es: {
        translation: {
            welcome: "Bienvenido a FarmWise",
            dashboard: "Tablero",
            advice: "Consejos Agrícolas",
            reminders: "Recordatorios",
            community: "Foro Comunitario",
            market: "Precios de Mercado",
            analytics: "Análisis",
            language: "Idioma",
            logout: "Cerrar Sesión",
            settings: "Configuración",
            profile: "Perfil",
            notifications: "Notificaciones",
        }
    },
    fr: {
        translation: {
            welcome: "Bienvenue à FarmWise",
            dashboard: "Tableau de Bord",
            advice: "Conseils Agricoles",
            reminders: "Rappels",
            community: "Forum Communautaire",
            market: "Prix du Marché",
            analytics: "Analytique",
            language: "Langue",
            logout: "Déconnexion",
            settings: "Paramètres",
            profile: "Profil",
            notifications: "Notifications",
        }
    },
    hi: {
        translation: {
            welcome: "फार्मवाइज में आपका स्वागत है",
            dashboard: "डैशबोर्ड",
            advice: "कृषि सलाह",
            reminders: "अनुस्मारक",
            community: "सामुदायिक मंच",
            market: "बाजार मूल्य",
            analytics: "विश्लेषण",
            language: "भाषा",
            logout: "लॉग आउट",
            settings: "सेटिंग्स",
            profile: "प्रोफाइल",
            notifications: "सूचनाएं",
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

// Load saved language
const loadLanguage = async () => {
    const savedLang = await AsyncStorage.getItem('language');
    if (savedLang && i18n.language !== savedLang) {
        i18n.changeLanguage(savedLang);
    }
};

loadLanguage();

export default i18n;