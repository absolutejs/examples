import { isValidProviderOption } from "citra";
import { providerData } from "../../shared/providerData";

export const providerLabel = (key: string) =>
  isValidProviderOption(key) ? providerData[key].name : key;

export const providerLogo = (key: string) =>
  isValidProviderOption(key) ? providerData[key].logoUrl : "";
