namespace GossipCupula.Api.Services;

/// <summary>
/// Falha ao enviar um arquivo para o object storage.
/// <para>
/// Existe como tipo próprio para a controller distinguir "o bucket recusou o
/// upload" (502, problema de infraestrutura — o cliente pode tentar de novo)
/// de "o post é inválido" (400, problema do payload). Sem isso, qualquer
/// exceção de infraestrutura viraria um 500 opaco.
/// </para>
/// </summary>
public class StorageUploadException : Exception
{
    public StorageUploadException(string message)
        : base(message)
    {
    }

    public StorageUploadException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
