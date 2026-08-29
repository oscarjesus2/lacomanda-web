$privateKeyBase64 = [Convert]::ToBase64String(
    [IO.File]::ReadAllBytes(
        "C:\Users\Oscar\source\repos\oscarjesus2\lacomanda-web\src\assets\signing\private-key.pem"
    )
)

Ese valor debe ir en el Backend.