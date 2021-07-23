export function keysAreDefined(object, ...keys) {
  if(!object) return false
  for(const key of keys) {
    if(/.+\..+/.test(key)) {
      const [ oKey, ...nested ] = key.split(".")

      if(nested.length > 1) return keysAreDefined(object[oKey], nested.join("."))

      return keysAreDefined(object[oKey], nested[0])
    }

    if(typeof object[key] === "undefined") return false
  }

  return true
}
