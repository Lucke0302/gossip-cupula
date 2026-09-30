using Microsoft.AspNetCore.Http;

namespace GossipCupula.Api.Services;

/// <summary>
/// Contrato de armazenamento de arquivos (imagens) em object storage.
/// <para>
/// O serviço é agnóstico ao provedor: hoje a implementação é o OCI Object
/// Storage (<see cref="OciStorageService"/>), mas os posts só conhecem este
/// contrato — trocar de bucket/provedor não mexe em <c>PostService</c>.
/// </para>
/// </summary>
public interface IStorageService
{
    /// <summary>
    /// Envia uma imagem e devolve a URL pública do objeto.
    /// </summary>
    /// <param name="file">Arquivo recebido no <c>multipart/form-data</c>.</param>
    /// <returns>URL pública (<c>https://objectstorage.{region}.oraclecloud.com/n/{namespace}/b/{bucket}/o/{objeto}</c>).</returns>
    /// <exception cref="StorageUploadException">Quando o object storage recusa ou não responde ao upload.</exception>
    Task<string> UploadImageAsync(IFormFile file);
}
