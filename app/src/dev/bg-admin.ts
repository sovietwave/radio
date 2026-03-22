type BackgroundAdminEntry = {
     path: string
     tags: string[]
     mobilePath: string | null
     folder: string
     hasMobile: boolean
}

type BackgroundAdminPayload = {
     entries: BackgroundAdminEntry[]
     folders: string[]
     tags: string[]
}

type DomRefs = {
     statusValue: HTMLDivElement
     feedback: HTMLDivElement
     tagFilters: HTMLDivElement
     folderSelect: HTMLSelectElement
     searchInput: HTMLInputElement
     missingCheckbox: HTMLInputElement
     reloadButton: HTMLButtonElement
     saveButton: HTMLButtonElement
     cardsViewport: HTMLElement
     cards: HTMLElement
}

const API_URL = '/__bg-admin/api/manifest'

const state = {
     entries: [] as BackgroundAdminEntry[],
     folders: [] as string[],
     tags: [] as string[],
     folder: 'all',
     search: '',
     selectedTags: [] as string[],
     onlyMissingMobile: false,
     dirty: false,
     saving: false,
     loading: true,
     message: '',
     error: '',
}

const app = document.getElementById('app')

if (!app) {
     throw new Error('Background admin root node not found')
}

const phoneIcon = `
<svg viewBox="0 0 24 24" aria-hidden="true">
     <path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm0 3v14h10V5H7Zm5 12.25a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm-.9-12.25 1.5 3h-1.7l.7 1.8-2.1 4.2h1.7l-.7 3 4.4-6h-1.8l1.2-3H11.1Z"/>
</svg>`

const style = document.createElement('style')
style.textContent = `
     :root {
          color-scheme: dark;
          --bg: #10151c;
          --panel: rgba(16, 22, 31, 0.96);
          --panel-soft: rgba(20, 28, 38, 0.96);
          --panel-strong: rgba(9, 14, 21, 0.98);
          --text: #edf4ff;
          --muted: #98a8be;
          --accent: #7fd0ff;
          --accent-soft: rgba(127, 208, 255, 0.16);
          --accent-strong: #4fb3ef;
          --danger: #ff7480;
          --danger-soft: rgba(255, 116, 128, 0.14);
          --success-soft: rgba(124, 226, 171, 0.14);
          --shadow: 0 10px 28px rgba(0, 0, 0, 0.24);
          --radius-lg: 10px;
          --radius-md: 8px;
          --radius-sm: 6px;
          font-family: "Segoe UI", "Trebuchet MS", sans-serif;
     }

     * {
          box-sizing: border-box;
     }

     body {
          margin: 0;
          min-height: 100vh;
          color: var(--text);
          background: var(--bg);
          overflow: hidden;
     }

     button,
     input,
     select {
          font: inherit;
          border: 0;
          outline: none;
     }

     button {
          border: 0;
     }

     .shell {
          width: min(calc(100vw - 28px), 1500px);
          height: 100vh;
          margin: 0 auto;
          padding: 14px 0;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          gap: 12px;
     }

     .panel {
          background: var(--panel);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow);
     }

     .topbar,
     .bottombar {
          padding: 14px;
          display: grid;
          gap: 10px;
          position: sticky;
          z-index: 2;
     }

     .topbar {
          top: 0;
     }

     .bottombar {
          bottom: 0;
     }

     .topbar-row,
     .bottombar-row {
          display: grid;
          gap: 10px;
     }

     .bottombar-row {
          grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
          align-items: start;
     }

     .status {
          padding: 10px 12px;
          border-radius: var(--radius-md);
          background: rgba(127, 208, 255, 0.08);
          min-height: 39px;
          display: flex;
          align-items: center;
     }

     .status-label,
     .folder,
     .empty {
          color: var(--muted);
          font-size: 12px;
          line-height: 1.45;
     }

     .status-label,
     .folder {
          text-transform: uppercase;
          letter-spacing: 0.08em;
     }

     .status-value {
          font-size: 13px;
          color: var(--muted);
     }

     .toolbar-grid {
          display: grid;
          grid-template-columns: 220px minmax(220px, 1fr) auto auto auto;
          gap: 10px;
          align-items: center;
     }

     .field,
     .search,
     .button,
     .tag-filter,
     .tag-option {
          min-height: 40px;
          border-radius: var(--radius-md);
          color: var(--text);
     }

     .field,
     .search {
          width: 100%;
          padding: 0 12px;
          background: var(--panel-strong);
     }

     .field::placeholder,
     .search::placeholder {
          color: var(--muted);
     }

     .button {
          padding: 0 16px;
          cursor: pointer;
          background: var(--panel-soft);
          transition: background 120ms ease, transform 120ms ease;
     }

     .button:hover,
     .tag-filter:hover,
     .tag-option:hover {
          transform: translateY(-1px);
     }

     .button-primary {
          background: var(--accent-soft);
          color: #dff4ff;
     }

     .button-primary:hover {
          background: rgba(127, 208, 255, 0.24);
     }

     .button-ghost {
          background: var(--panel-strong);
     }

     .toggle {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--muted);
          user-select: none;
          min-height: 40px;
          padding: 0 2px;
     }

     .toggle input {
          accent-color: var(--accent-strong);
     }

     .message {
          min-height: 39px;
          padding: 10px 12px;
          border-radius: var(--radius-md);
          font-size: 13px;
     }

     .message-info {
          color: var(--muted);
          background: rgba(127, 208, 255, 0.08);
     }

     .message-error {
          color: #ffd9dc;
          background: var(--danger-soft);
     }

     .message-empty {
          background: rgba(127, 208, 255, 0.08);
          color: transparent;
     }

     .tag-cloud,
     .tag-options {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
     }

     .tag-filter,
     .tag-option,
     .tag-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          background: var(--panel-soft);
          min-height: 40px;
          border-radius: var(--radius-md);
     }

     .tag-filter,
     .tag-option {
          cursor: pointer;
     }

     .tag-filter {
          color: var(--muted);
     }

     .tag-filter-active,
     .tag-option-active {
          color: var(--text);
          background: rgba(79, 179, 239, 0.34);
          box-shadow: inset 0 0 0 1px rgba(127, 208, 255, 0.22);
     }

     .tag-badge {
          color: var(--muted);
     }

     .content {
          min-height: 0;
          overflow: hidden;
     }

     .cards-viewport {
          height: 100%;
          overflow: auto;
          padding: 2px 4px;
     }

     .cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, 300px);
          gap: 14px;
          justify-content: center;
          padding: 2px;
     }

     .card {
          overflow: hidden;
          width: 300px;
     }

     .thumb {
          position: relative;
          aspect-ratio: 16 / 10;
          background: #05080d;
          overflow: hidden;
     }

     .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
     }

     .mobile-warning {
          width: 16px;
          height: 16px;
          flex: 0 0 auto;
          color: var(--danger);
     }

     .mobile-warning svg {
          width: 100%;
          height: 100%;
          fill: currentColor;
     }

     .card-body {
          padding: 14px;
          display: grid;
          gap: 10px;
     }

     .card .tag-options {
          gap: 6px;
     }

     .card .tag-option {
          min-height: 30px;
          padding: 0 10px;
          border-radius: var(--radius-sm);
      }

     .path-row {
          display: flex;
          align-items: center;
          gap: 8px;
     }

     .path {
          font-size: 13px;
          line-height: 1.45;
          word-break: break-word;
     }

     @media (max-width: 960px) {
          .shell {
               width: min(calc(100vw - 18px), 1500px);
               padding: 10px 0;
          }

          .bottombar-row {
               grid-template-columns: 1fr;
          }

          .toolbar-grid {
               grid-template-columns: 1fr;
          }

          .cards-viewport {
               padding-left: 0;
               padding-right: 0;
          }
     }
`
document.head.append(style)

const compareText = (left: string, right: string) =>
     left.localeCompare(right, 'ru')

const cloneEntry = (entry: BackgroundAdminEntry): BackgroundAdminEntry => ({
     ...entry,
     tags: [...entry.tags],
})

const getKnownTags = () =>
     [...new Set([...state.tags, ...state.entries.flatMap((entry) => entry.tags)])].sort(
          compareText
     )

const setFeedback = (message: string, isError = false) => {
     if (isError) {
          state.error = message
          state.message = ''
     } else {
          state.message = message
          state.error = ''
     }
}

const createElement = <K extends keyof HTMLElementTagNameMap>(
     tagName: K,
     className?: string,
     text?: string
) => {
     const element = document.createElement(tagName)

     if (className) element.className = className
     if (typeof text == 'string') element.textContent = text

     return element
}

const dom = {} as DomRefs
type CardDomRef = {
     root: HTMLElement
     options: HTMLDivElement
     optionButtons: Map<string, HTMLButtonElement>
}

let persistedTagsByPath = new Map<string, string[]>()
let tagFilterButtons = new Map<string, HTMLButtonElement>()
let cardDomByPath = new Map<string, CardDomRef>()
let renderedKnownTags: string[] = []

const cloneTags = (tags: string[]) => [...tags].sort(compareText)

const areTagsEqual = (left: string[], right: string[]) =>
     left.length == right.length && left.every((tag, index) => tag == right[index])

const snapshotEntries = (entries: BackgroundAdminEntry[]) =>
     new Map(entries.map((entry) => [entry.path, cloneTags(entry.tags)]))

const getDirtyEntryCount = () => {
     let count = 0

     for (const entry of state.entries) {
          const persistedTags = persistedTagsByPath.get(entry.path) ?? []
          if (!areTagsEqual(cloneTags(entry.tags), persistedTags)) {
               count += 1
          }
     }

     return count
}

const formatEntryCount = (count: number) => {
     const mod10 = count % 10
     const mod100 = count % 100

     if (mod10 == 1 && mod100 != 11) return `${count} карточка`
     if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
          return `${count} карточки`
     }

     return `${count} карточек`
}

const syncSelectedTags = (knownTags = getKnownTags()) => {
     const knownTagSet = new Set(knownTags)
     state.selectedTags = state.selectedTags.filter((tag) => knownTagSet.has(tag))
}

const areStringListsEqual = (left: string[], right: string[]) =>
     left.length == right.length && left.every((value, index) => value == right[index])

const getFilteredEntries = () => {
     const needle = state.search.trim().toLowerCase()
     const selectedTagSet = new Set(state.selectedTags)

     return state.entries.filter((entry) => {
          if (state.folder != 'all' && entry.folder != state.folder) return false
          if (state.onlyMissingMobile && entry.hasMobile) return false

          if (
               selectedTagSet.size > 0 &&
               !entry.tags.some((tag) => selectedTagSet.has(tag))
          ) {
               return false
          }

          if (!needle) return true

          return `${entry.path} ${entry.tags.join(' ')}`
               .toLowerCase()
               .includes(needle)
     })
}

const requestData = async (method = 'GET', body?: object) => {
     const response = await fetch(API_URL, {
          method,
          headers:
               method == 'POST'
                    ? {
                           'Content-Type': 'application/json',
                      }
                    : undefined,
          body: body ? JSON.stringify(body) : undefined,
     })

     const payload = (await response.json()) as BackgroundAdminPayload & {
          error?: string
     }

     if (!response.ok) {
          throw new Error(payload.error || 'Request failed')
     }

     return payload
}

const syncFromPayload = (payload: BackgroundAdminPayload) => {
     state.entries = payload.entries.map(cloneEntry)
     state.folders = payload.folders
     state.tags = payload.tags
     persistedTagsByPath = snapshotEntries(state.entries)
     cardDomByPath = new Map()
     renderedKnownTags = []

     if (state.folder != 'all' && !state.folders.includes(state.folder)) {
          state.folder = 'all'
     }

     syncSelectedTags()
}

const updateFolderOptions = () => {
     const currentOptions = Array.from(dom.folderSelect.options).map(
          (option) => option.value
     )
     const nextOptions = ['all', ...state.folders]

     const sameOptions =
          currentOptions.length == nextOptions.length &&
          currentOptions.every((value, index) => value == nextOptions[index])

     if (!sameOptions) {
          dom.folderSelect.replaceChildren()
          dom.folderSelect.append(new Option('Все папки', 'all'))

          for (const folder of state.folders) {
               dom.folderSelect.append(new Option(folder, folder))
          }
     }

     dom.folderSelect.value = state.folder
}

const toggleSelectedTag = (tag: string) => {
     if (state.selectedTags.includes(tag)) {
          state.selectedTags = state.selectedTags.filter((value) => value != tag)
     } else {
          state.selectedTags = [...state.selectedTags, tag].sort(compareText)
     }

     updateView()
}

const createCard = (entry: BackgroundAdminEntry) => {
     const card = createElement('article', 'panel card')
     card.dataset.path = entry.path
     const thumb = createElement('div', 'thumb')
     const image = document.createElement('img')
     image.src = entry.path
     image.alt = entry.path
     thumb.append(image)

     const body = createElement('div', 'card-body')
     const pathRow = createElement('div', 'path-row')
     pathRow.append(createElement('div', 'path', entry.path))
     if (!entry.hasMobile) {
          const warning = createElement('div', 'mobile-warning')
          warning.title =
               'smartphone-charging: для этого desktop-файла не найден mobile-дубликат'
          warning.innerHTML = phoneIcon
          pathRow.append(warning)
     }
     body.append(pathRow)

     const options = createElement('div', 'tag-options')
     body.append(options)

     card.append(thumb, body)
     return {
          root: card,
          options,
          optionButtons: new Map<string, HTMLButtonElement>(),
     }
}

const hasActiveFilters = () =>
     state.folder != 'all' ||
     state.onlyMissingMobile ||
     state.selectedTags.length > 0 ||
     state.search.trim().length > 0

const findRenderedCard = (path: string) => {
     return cardDomByPath.get(path) ?? null
}

const ensureTagOptionButtons = (
     cardRef: CardDomRef,
     entry: BackgroundAdminEntry,
     knownTags: string[]
) => {
     if (!areStringListsEqual([...cardRef.optionButtons.keys()], knownTags)) {
          cardRef.options.replaceChildren()
          cardRef.optionButtons = new Map()

          for (const tag of knownTags) {
               const option = createElement('button', 'tag-option', tag) as HTMLButtonElement
               option.type = 'button'
               option.addEventListener('click', () => toggleTag(entry.path, tag))
               cardRef.optionButtons.set(tag, option)
               cardRef.options.append(option)
          }
     }

     const tagSet = new Set(entry.tags)
     for (const [tag, option] of cardRef.optionButtons) {
          option.classList.toggle('tag-option-active', tagSet.has(tag))
     }
}

const syncRenderedCardTags = (path: string, knownTags: string[]) => {
     const entry = state.entries.find((value) => value.path == path)
     const renderedCard = findRenderedCard(path)

     if (!entry || !renderedCard) return false

     ensureTagOptionButtons(renderedCard, entry, knownTags)

     return true
}

const ensureCardDom = (entry: BackgroundAdminEntry, knownTags: string[]) => {
     let cardRef = cardDomByPath.get(entry.path)
     if (!cardRef) {
          cardRef = createCard(entry)
          cardDomByPath.set(entry.path, cardRef)
     }

     ensureTagOptionButtons(cardRef, entry, knownTags)
     return cardRef
}

const renderCards = (entries: BackgroundAdminEntry[], knownTags: string[]) => {
     if (entries.length == 0) {
          dom.cards.replaceChildren(
               createElement(
                    'div',
                    'panel hero',
                    'По текущим фильтрам ничего не найдено.'
               )
          )
          return
     }

     const roots: HTMLElement[] = []
     for (const entry of entries) {
          roots.push(ensureCardDom(entry, knownTags).root)
     }

     dom.cards.replaceChildren(...roots)
}

const syncTagFilterButtons = (knownTags: string[]) => {
     if (!areStringListsEqual([...tagFilterButtons.keys()], knownTags)) {
          dom.tagFilters.replaceChildren()
          tagFilterButtons = new Map()

          for (const tag of knownTags) {
               const button = createElement('button', 'tag-filter', tag) as HTMLButtonElement
               button.type = 'button'
               button.addEventListener('click', () => toggleSelectedTag(tag))
               tagFilterButtons.set(tag, button)
               dom.tagFilters.append(button)
          }
     }

     for (const [tag, button] of tagFilterButtons) {
          button.classList.toggle('tag-filter-active', state.selectedTags.includes(tag))
     }

     renderedKnownTags = [...knownTags]
}

const updateChrome = (knownTags: string[]) => {
     const dirtyEntryCount = getDirtyEntryCount()
     const statusText = state.loading
          ? `Загрузка... ${formatEntryCount(dirtyEntryCount)} с изменениями`
          : state.saving
          ? `Сохранение... ${formatEntryCount(dirtyEntryCount)} с изменениями`
          : state.dirty
          ? `${formatEntryCount(dirtyEntryCount)} с изменениями`
          : 'Синхронизировано'
     dom.statusValue.textContent = statusText

     dom.feedback.replaceChildren()
     if (state.error) {
          dom.feedback.append(
               createElement('div', 'message message-error', state.error)
          )
     } else if (state.message) {
          dom.feedback.append(
               createElement('div', 'message message-info', state.message)
          )
     } else {
          dom.feedback.append(createElement('div', 'message message-empty', '.'))
     }

     if (knownTags.length == 0) {
          if (tagFilterButtons.size > 0 || dom.tagFilters.childElementCount == 0) {
               dom.tagFilters.replaceChildren(createElement('div', 'tag-badge', 'Тегов пока нет'))
               tagFilterButtons = new Map()
          }
     } else {
          syncTagFilterButtons(knownTags)
     }

     updateFolderOptions()
     dom.missingCheckbox.checked = state.onlyMissingMobile
     dom.reloadButton.disabled = state.loading || state.saving
     dom.saveButton.disabled = state.loading || state.saving
     dom.saveButton.textContent = state.saving
          ? 'Сохранение...'
          : 'Сохранить manifest'
}

const updateView = () => {
     const knownTags = getKnownTags()
     syncSelectedTags(knownTags)
     updateChrome(knownTags)
     renderCards(getFilteredEntries(), knownTags)
}

const updateChangedEntry = (path: string, previousKnownTags: string[]) => {
     const knownTags = getKnownTags()
     const knownTagsChanged = !areTagsEqual(
          cloneTags(previousKnownTags),
          cloneTags(knownTags)
     )

     syncSelectedTags(knownTags)
     updateChrome(knownTags)

     if (knownTagsChanged || hasActiveFilters() || !areStringListsEqual(renderedKnownTags, knownTags)) {
          renderCards(getFilteredEntries(), knownTags)
          return
     }

     if (!syncRenderedCardTags(path, knownTags)) {
          renderCards(getFilteredEntries(), knownTags)
     }
}

const setupLayout = () => {
     const shell = createElement('div', 'shell')

     const topbar = createElement('section', 'panel topbar')
     const tagFilters = createElement('div', 'tag-cloud')
     const controls = createElement('div', 'toolbar-grid')

     const folderSelect = createElement('select', 'field') as HTMLSelectElement
     folderSelect.addEventListener('change', () => {
          state.folder = folderSelect.value
          updateView()
     })

     const searchInput = createElement('input', 'search') as HTMLInputElement
     searchInput.placeholder = 'Поиск по пути или тегу'
     searchInput.value = state.search
     searchInput.addEventListener('input', () => {
          state.search = searchInput.value
          updateView()
     })

     const missingToggle = createElement('label', 'toggle')
     const missingCheckbox = document.createElement('input')
     missingCheckbox.type = 'checkbox'
     missingCheckbox.checked = state.onlyMissingMobile
     missingCheckbox.addEventListener('change', () => {
          state.onlyMissingMobile = missingCheckbox.checked
          updateView()
     })
     missingToggle.append(
          missingCheckbox,
          createElement('span', '', 'Только без mobile')
     )

     const reloadButton = createElement(
          'button',
          'button button-ghost',
          'Перезагрузить'
     ) as HTMLButtonElement
     reloadButton.type = 'button'
     reloadButton.addEventListener('click', () => {
          void load()
     })

     const saveButton = createElement(
          'button',
          'button button-primary',
          'Сохранить manifest'
     ) as HTMLButtonElement
     saveButton.type = 'button'
     saveButton.addEventListener('click', () => {
          void save()
     })

     controls.append(
          folderSelect,
          searchInput,
          missingToggle,
          reloadButton,
          saveButton
     )
     topbar.append(tagFilters, controls)

     const content = createElement('main', 'content')
     const cardsViewport = createElement('section', 'cards-viewport')
     const cards = createElement('section', 'cards')
     cardsViewport.append(cards)
     content.append(cardsViewport)

     const bottombar = createElement('section', 'panel bottombar')
     const bottombarRow = createElement('div', 'bottombar-row')
     const status = createElement('div', 'status')
     const statusValue = createElement('div', 'status-value')
     status.append(statusValue)
     const feedback = createElement('div')
     bottombarRow.append(status, feedback)
     bottombar.append(bottombarRow)

     shell.append(topbar, content, bottombar)
     app.replaceChildren(shell)

     dom.statusValue = statusValue
     dom.feedback = feedback
     dom.tagFilters = tagFilters
     dom.folderSelect = folderSelect
     dom.searchInput = searchInput
     dom.missingCheckbox = missingCheckbox
     dom.reloadButton = reloadButton
     dom.saveButton = saveButton
     dom.cardsViewport = cardsViewport
     dom.cards = cards
}

const markDirty = () => {
     state.dirty = getDirtyEntryCount() > 0
     setFeedback('')
}

const updateEntry = (
     path: string,
     updater: (entry: BackgroundAdminEntry) => BackgroundAdminEntry
) => {
     state.entries = state.entries.map((entry) =>
          entry.path == path ? updater(cloneEntry(entry)) : entry
     )
}

const addTag = (path: string, rawTag: string) => {
     const tag = rawTag.trim()
     if (!tag) return

     const previousKnownTags = getKnownTags()
     let changed = false
     updateEntry(path, (entry) => {
          if (entry.tags.includes(tag)) return entry
          entry.tags = [...entry.tags, tag].sort(compareText)
          changed = true
          return entry
     })

     if (!changed) return
     state.tags = getKnownTags()
     markDirty()
     updateChangedEntry(path, previousKnownTags)
}

const removeTag = (path: string, tag: string) => {
     const previousKnownTags = getKnownTags()
     let changed = false
     updateEntry(path, (entry) => {
          if (!entry.tags.includes(tag)) return entry
          entry.tags = entry.tags.filter((value) => value != tag)
          changed = true
          return entry
     })

     if (!changed) return
     state.tags = getKnownTags()
     syncSelectedTags()
     markDirty()
     updateChangedEntry(path, previousKnownTags)
}

const toggleTag = (path: string, tag: string) => {
     const entry = state.entries.find((value) => value.path == path)
     if (!entry) return

     if (entry.tags.includes(tag)) {
          removeTag(path, tag)
     } else {
          addTag(path, tag)
     }
}

const load = async () => {
     state.loading = true
     updateView()

     try {
          const payload = await requestData()
          syncFromPayload(payload)
          state.dirty = false
          setFeedback('Manifest загружен.')
     } catch (error) {
          setFeedback(
               error instanceof Error ? error.message : 'Не удалось загрузить manifest',
               true
          )
     } finally {
          state.loading = false
          updateView()
     }
}

const save = async () => {
     state.saving = true
     updateView()

     try {
          const payload = await requestData('POST', {
               entries: state.entries.map((entry) => ({
                    path: entry.path,
                    tags: entry.tags,
               })),
          })
          syncFromPayload(payload)
          state.dirty = false
          setFeedback('Manifest сохранён.')
     } catch (error) {
          setFeedback(
               error instanceof Error ? error.message : 'Не удалось сохранить manifest',
               true
          )
     } finally {
          state.saving = false
          updateView()
     }
}

setupLayout()
updateView()
void load()

window.addEventListener('beforeunload', (event) => {
     if (!state.dirty) return
     event.preventDefault()
})
