## Neovim Crash Course

### The Mental Model

Neovim has **modes**. This is the entire learning curve.

| Mode | How to enter | What it does |
|---|---|---|
| **Normal** | `Esc` | Navigate, delete, copy, paste — this is "home base" |
| **Insert** | `i`, `a`, `o` | Type text like a normal editor |
| **Visual** | `v`, `V`, `Ctrl+v` | Select text |
| **Command** | `:` | Run commands (save, quit, search-replace) |

**Rule: you spend 80% of your time in Normal mode.** You dip into Insert to type, then immediately hit `Esc` to go back.

---

### Survival (memorize these first)

```
i          Enter Insert mode (type text)
Esc        Back to Normal mode
:w         Save
:q         Quit
:wq        Save and quit
:q!        Quit without saving (force)
u          Undo
Ctrl+r     Redo
```

---

### Movement (Normal mode)

```
h j k l    Left, Down, Up, Right (instead of arrow keys)
w          Jump forward one word
b          Jump back one word
e          Jump to end of word
0          Start of line
$          End of line
^          First non-blank character
gg         Top of file
G          Bottom of file
Ctrl+d     Half page down
Ctrl+u     Half page up
/text      Search forward (n = next, N = prev)
```

**Numbers multiply:** `5j` = move down 5 lines. `3w` = skip 3 words.

---

### The Verb-Object Grammar

This is Vim's superpower. Commands follow: **verb + motion/object**

**Verbs:**
```
d          Delete
c          Change (delete + enter Insert mode)
y          Yank (copy)
```

**Objects/Motions:**
```
w          Word (from cursor to next word)
iw         Inner word (whole word under cursor)
i"         Inner quotes
i(         Inner parentheses
i{         Inner braces
it         Inner tag (HTML)
$          To end of line
gg         To top of file
```

**Combine them:**
```
dw         Delete word
diw        Delete inner word (whole word regardless of cursor position)
ci"        Change inside quotes (delete content, start typing)
yi{        Yank inside braces
d$         Delete to end of line
dG         Delete to end of file
ct)        Change up to the )
```

**Shortcuts for common combos:**
```
dd         Delete entire line
yy         Yank entire line
cc         Change entire line
D          Delete to end of line (same as d$)
C          Change to end of line
x          Delete character under cursor
p          Paste after cursor
P          Paste before cursor
```

---

### Entering Insert Mode

```
i          Insert before cursor
a          Insert after cursor
I          Insert at start of line
A          Insert at end of line
o          New line below, enter Insert
O          New line above, enter Insert
```

---

### Visual Mode (selecting)

```
v          Character-wise selection
V          Line-wise selection
Ctrl+v     Block selection (columns!)
```

Then apply a verb: `d` to delete, `y` to yank, `c` to change, `>` to indent, `<` to unindent.

---

### Essential Commands

```
:w                    Save
:e filename           Open file
:bn :bp               Next/prev buffer
:sp :vsp              Horizontal/vertical split
Ctrl+w h/j/k/l       Move between splits
:term                 Open terminal
:%s/old/new/g         Replace all in file
:s/old/new/g          Replace all in current line
.                     Repeat last command (incredibly powerful)
*                     Search for word under cursor
```

---

### LSP (Language Server Protocol)

Neovim's built-in LSP client is language-agnostic. It speaks the LSP standard — the intelligence comes from the language server you connect it to. One editor, one config, every language.

| Language | Server |
|---|---|
| TypeScript/JS | `typescript-language-server` |
| Python | `pyright` or `pylsp` |
| Rust | `rust-analyzer` |
| Go | `gopls` |
| Lua | `lua_ls` |
| C/C++ | `clangd` |
| CSS/HTML | `cssls`, `html` |
| JSON | `jsonls` |
| Bash | `bashls` |

**Installing servers:** Use **Mason** (`:Mason`) — a built-in package manager for language servers. Pick your languages, Mason downloads the servers, Neovim auto-attaches them when you open a matching file.

**What LSP gives you:**
- Autocomplete (function names, arguments, imports)
- Go to definition (`gd`)
- Find references (`gr`)
- Hover docs (`K`)
- Rename symbol across files (`:lua vim.lsp.buf.rename()`)
- Diagnostics (errors/warnings inline)
- Code actions (auto-import, extract function)

Both kickstart.nvim and LazyVim come with LSP pre-configured — just install the servers you need via `:Mason`.

---

### Getting Started for Real

**1. Install:**
```bash
brew install neovim
```

**2. Set as default editor:**
```bash
echo 'export EDITOR=nvim' >> ~/.zshrc
echo 'alias vim=nvim' >> ~/.zshrc
source ~/.zshrc
```

**3. Run the built-in tutorial:**
```bash
nvim +Tutor
```
This is a 30-minute interactive lesson. Do it once.

**4. Starter config** — don't build from scratch, use a distribution:

- **kickstart.nvim** (github.com/nvim-lua/kickstart.nvim) — single-file config, ~500 lines, teaches you how it works. Best for learning.
- **LazyVim** — batteries-included, ready to go. Best if you want IDE features immediately.

For kickstart:
```bash
git clone https://github.com/nvim-lua/kickstart.nvim ~/.config/nvim
nvim
```

It auto-installs LSP, Treesitter, Telescope, autocompletion on first launch.

---

### The 2-Week Plan

**Week 1:** Use nvim for every file edit. Keep this cheat sheet open. Only use `i`, `Esc`, `:wq`, `dd`, `u`, `p`, `/search`. Fight the urge to switch back.

**Week 2:** Start using motions: `ciw`, `di"`, `ct)`, `V` + `d`. Use `.` to repeat. Use `*` to search for the word under cursor.

After that you'll wonder how you ever edited text any other way.
