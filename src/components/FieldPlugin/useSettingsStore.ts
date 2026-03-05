import { ref } from 'vue'

const metaFieldsMap = ref<Record<string, string>>({})

export const fetchSettings = async (token: string) => {
  if (!token) return

  try {
    const res = await fetch(`https://api.filerobot.com/${token}/v5/settings`)
    if (!res.ok) return
    const data = await res.json();

    const fields: Array<{ key: string; title: string }> =
      (data.metadata.model ?? []).flatMap((entry: any) =>
        (entry.groups ?? []).flatMap((group: any) => group.fields ?? [])
      );

    const map: Record<string, string> = {}
    for (const f of fields) {
      if (f.key && f.title) map[f.key] = f.title
    }

    metaFieldsMap.value = map
  } catch { }
}

export const getFieldTitle = (key: string): string =>
  metaFieldsMap.value[key] || key
