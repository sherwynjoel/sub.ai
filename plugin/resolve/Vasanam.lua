--[[
  Vasanam for DaVinci Resolve (free and Studio, 18+).
  Install: put this file in the Scripts/Utility folder (see the Plugin page), restart Resolve,
  then open Workspace > Scripts > Vasanam.
  It sends the clip under the playhead to Vasanam, waits for the subtitles and puts them on a
  subtitle track lined up with the clip. Minutes come out of the account the API key belongs to.
  Needs curl (built into Windows 10+ and macOS).
]]

local SERVER_DEFAULT = "__VASANAM_SERVER__"
local LANGUAGES = __VASANAM_LANGUAGES__
local OUTPUTS = { { "ta", "That language" }, { "en", "English" }, { "both", "Both, stacked" } }

local resolve = resolve or Resolve()
local fusion = fu or resolve:Fusion()
local ui = fusion.UIManager
local disp = bmd.UIDispatcher(ui)

local isWin = package.config:sub(1, 1) == "\\"
local SEP = isWin and "\\" or "/"
local TMP = os.getenv(isWin and "TEMP" or "TMPDIR") or "/tmp"
local HOME = os.getenv(isWin and "USERPROFILE" or "HOME") or TMP
local OUTDIR = HOME .. SEP .. "Documents" .. SEP .. "Vasanam"

-- ---------- helpers ----------
local function setting(k, v)
  if v == nil then return fusion:GetData("Vasanam." .. k) end
  fusion:SetData("Vasanam." .. k, v)
end
local function q(s) return '"' .. tostring(s) .. '"' end
local function readAll(path)
  local f = io.open(path, "rb"); if not f then return "" end
  local s = f:read("*a"); f:close(); return s
end
local function sh(cmd)
  local f = io.popen(cmd); local out = f:read("*a"); f:close(); return out
end
local function urlencode(s)
  return (tostring(s):gsub("[^%w%-%._~]", function(c) return string.format("%%%02X", string.byte(c)) end))
end
local function server() return ((setting("server") or SERVER_DEFAULT):gsub("/+$", "")) end

-- Runs curl with the API key in a header file (kept off the command line), returns status code and body.
local function api(method, path, opts)
  opts = opts or {}
  local hdr = TMP .. SEP .. "vasanam_hdr.txt"
  local out = opts.out or (TMP .. SEP .. "vasanam_resp.txt")
  local f = io.open(hdr, "w"); f:write("Authorization: Bearer " .. (setting("key") or "") .. "\n"); f:close()
  local cmd = "curl -sS -X " .. method .. " -H @" .. q(hdr) .. " -o " .. q(out) .. ' -w "%{http_code}"'
  if opts.file then cmd = cmd .. ' -H "content-type: application/octet-stream" -T ' .. q(opts.file) end
  cmd = cmd .. " " .. q(server() .. path)
  local code = tonumber(sh(cmd):match("(%d%d%d)%s*$") or "0")
  os.remove(hdr)
  local body = opts.out and "" or readAll(out)
  if not opts.out then os.remove(out) end
  return code, body
end
local function field(body, name) return body:match('"' .. name .. '":"(.-)"') end
local function num(body, name) return tonumber(body:match('"' .. name .. '":([%d%.]+)')) end

-- ---------- window ----------
local win = disp:AddWindow({
  ID = "VasanamWin", WindowTitle = "Vasanam subtitles", Geometry = { 200, 200, 440, 330 },
  ui:VGroup({
    ui:Label({ ID = "Account", Text = "Paste your API key from the Vasanam Plugin page.", WordWrap = true }),
    ui:HGroup({ ui:Label({ Text = "Server", Weight = 0.35 }), ui:LineEdit({ ID = "Server", Weight = 0.65 }) }),
    ui:HGroup({ ui:Label({ Text = "API key", Weight = 0.35 }), ui:LineEdit({ ID = "Key", EchoMode = "Password", Weight = 0.65 }) }),
    ui:Button({ ID = "Connect", Text = "Connect" }),
    ui:HGroup({ ui:Label({ Text = "Spoken language", Weight = 0.35 }), ui:ComboBox({ ID = "Lang", Weight = 0.65 }) }),
    ui:HGroup({ ui:Label({ Text = "Put on timeline", Weight = 0.35 }), ui:ComboBox({ ID = "Out", Weight = 0.65 }) }),
    ui:Button({ ID = "Go", Text = "Subtitle the clip under the playhead" }),
    ui:Label({ ID = "Status", Text = "", WordWrap = true }),
  }),
})
local itm = win:GetItems()
for _, l in ipairs(LANGUAGES) do itm.Lang:AddItem(l[2]) end
for _, o in ipairs(OUTPUTS) do itm.Out:AddItem(o[2]) end
itm.Server.Text = server()
itm.Key.Text = setting("key") or ""
itm.Lang.CurrentIndex = tonumber(setting("lang") or "0") or 0

local function say(t) itm.Status.Text = t end

local function refreshAccount()
  local code, body = api("GET", "/api/me")
  if code ~= 200 then
    itm.Account.Text = code == 0 and "Can't reach the server. Check the address." or "That API key didn't work. Copy it again from the Plugin page."
    return false
  end
  itm.Account.Text = (field(body, "name") or "") .. " · " .. (field(body, "planName") or "") .. " plan · " .. math.floor((num(body, "secondsLeft") or 0) / 60) .. " min left"
  return true
end

function win.On.Connect.Clicked()
  setting("server", (itm.Server.Text:gsub("%s", "")))
  setting("key", (itm.Key.Text:gsub("%s", "")))
  refreshAccount()
end

-- ---------- generate ----------
local job -- { id, item, timeline, shift, out }

-- Seconds to move the subtitles so they line up with where the clip sits (and how it's trimmed) on the timeline.
local function shiftFor(timeline, item)
  local fps = tonumber(timeline:GetSetting("timelineFrameRate")) or 24
  return (item:GetStart() - timeline:GetStartFrame() - item:GetLeftOffset()) / fps
end

local function place()
  local lang = OUTPUTS[itm.Out.CurrentIndex + 1][1]
  os.execute((isWin and "mkdir " or "mkdir -p ") .. q(OUTDIR) .. (isWin and " 2>nul" or " 2>/dev/null"))
  local srt = OUTDIR .. SEP .. job.id .. "." .. lang .. ".srt"
  local code = api("GET", "/api/jobs/" .. job.id .. "/export?fmt=srt&lang=" .. lang .. "&shift=" .. string.format("%.3f", job.shift), { out = srt })
  if code ~= 200 then return say("Subtitles are ready but the download failed (" .. code .. "). Open them in the web editor.") end

  local project = resolve:GetProjectManager():GetCurrentProject()
  local mp = project:GetMediaPool()
  local root = mp:GetRootFolder()
  local bin
  for _, f in ipairs(root:GetSubFolderList() or {}) do if f:GetName() == "Vasanam" then bin = f end end
  bin = bin or mp:AddSubFolder(root, "Vasanam")
  mp:SetCurrentFolder(bin)
  local items = mp:ImportMedia({ srt })
  if not items or #items == 0 then return say("Saved " .. srt .. ". Import it with File > Import > Subtitle.") end
  project:SetCurrentTimeline(job.timeline)
  local placed = mp:AppendToTimeline({ { mediaPoolItem = items[1], recordFrame = job.timeline:GetStartFrame() } })
  if placed and #placed > 0 then
    say("Done. Subtitles are on the subtitle track, lined up with your clip.")
  else
    say("Done. The subtitles are in the Vasanam bin; drag them to the very start of the timeline.")
  end
  refreshAccount()
end

local function poll()
  local code, body = api("GET", "/api/jobs/" .. job.id)
  if code ~= 200 then return true, say("Lost contact with the server (" .. code .. "). Retrying…") end
  local status = field(body, "status")
  if status == "done" then place(); return false end
  if status == "failed" then
    say("Couldn't subtitle this clip: " .. (field(body, "error") or "unknown error") .. " Your minutes were returned.")
    return false
  end
  say(status == "queued" and "Waiting in line…" or ("Writing subtitles… " .. (num(body, "progress") or 0) .. "%"))
  return true
end

local timer = ui:Timer({ ID = "Poll", Interval = 2000 })
function disp.On.Timeout()
  if job and not poll() then timer:Stop(); itm.Go.Enabled = true; job = nil end
end

function win.On.Go.Clicked()
  if not refreshAccount() then return end
  local project = resolve:GetProjectManager():GetCurrentProject()
  local timeline = project and project:GetCurrentTimeline()
  local item = timeline and timeline:GetCurrentVideoItem()
  if not item then return say("Open a timeline and put the playhead over a video clip.") end
  local mpi = item:GetMediaPoolItem()
  local path = mpi and mpi:GetClipProperty("File Path")
  if not path or path == "" then return say("This clip has no media file (a title or generator?). Pick a video clip.") end

  setting("lang", tostring(itm.Lang.CurrentIndex))
  local lang = LANGUAGES[itm.Lang.CurrentIndex + 1][1]
  local name = path:match("[^/\\]+$") or "clip"
  say("Uploading " .. name .. "… (Resolve may pause until the upload finishes)")
  itm.Go.Enabled = false
  local code, body = api("POST", "/api/upload?name=" .. urlencode(name) .. "&lang=" .. lang, { file = path })
  if code ~= 201 then
    itm.Go.Enabled = true
    return say(field(body, "error") or ("Upload failed (" .. code .. ")."))
  end
  job = { id = field(body, "id"), timeline = timeline, shift = shiftFor(timeline, item) }
  say("Uploaded. Writing subtitles…")
  timer:Start()
end

function win.On.VasanamWin.Close() timer:Stop(); disp:ExitLoop() end

if setting("key") then refreshAccount() end
win:Show()
disp:RunLoop()
win:Hide()
