Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("Wscript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir

electron = dir & "\node_modules\electron\dist\electron.exe"
If Not fso.FileExists(electron) Then
  sh.Environment("Process")("ELECTRON_MIRROR") = "https://npmmirror.com/mirrors/electron/"
  sh.Run "cmd /c npm install", 1, True
End If

If fso.FileExists(electron) Then
  sh.Run """" & electron & """ """ & dir & """", 0, False
End If
