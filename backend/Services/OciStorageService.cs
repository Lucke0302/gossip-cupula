using Microsoft.AspNetCore.Http;
using Oci.Common;
using Oci.Common.Auth;
using Oci.ObjectstorageService;
using Oci.ObjectstorageService.Requests;

namespace GossipCupula.Api.Services;

/// <summary>
/// Armazenamento de imagens no OCI Object Storage usando a SDK nativa da
/// Oracle (<c>OCI.DotNetSDK.Objectstorage</c>) — sem SDK de terceiros e sem
/// passar por API compatível com S3.
/// <para>
/// <b>Autenticação:</b> rodando na VM da OCI, o serviço usa
/// <b>Instance Principals</b>
/// (<see cref="InstancePrincipalsAuthenticationDetailsProvider"/>): o tenancy
/// confia na identidade da instância e nenhuma chave privada precisa existir
/// no disco do servidor. Fora da OCI (desenvolvimento local) o instance
/// principal não existe, então o serviço cai automaticamente para o
/// <see cref="ConfigFileAuthenticationDetailsProvider"/>, que lê o mesmo
/// <c>~/.oci/config</c> do OCI CLI.
/// </para>
/// <para>
/// <b>Configuração (appsettings — seção <c>OCI</c>):</b> <c>Namespace</c> e
/// <c>BucketName</c> (obrigatórios), <c>Region</c> (obrigatório; entra no
/// endpoint e na URL pública), <c>Endpoint</c> (opcional; template do
/// endpoint), <c>AuthMode</c> (<c>InstancePrincipals</c> = padrão, ou
/// <c>ConfigFile</c>), <c>Profile</c> e <c>ConfigFilePath</c> (só o fallback
/// local usa).
/// </para>
/// </summary>
public class OciStorageService : IStorageService, IDisposable
{
    /// <summary>
    /// Extensão aceita → ContentType. Lista fechada: o nome e o tipo do
    /// arquivo vêm do cliente, então nada de string livre virando URL em um
    /// bucket público.
    /// </summary>
    private static readonly Dictionary<string, string> ExtensionToContentType = new(StringComparer.OrdinalIgnoreCase)
    {
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".png"] = "image/png",
        [".webp"] = "image/webp",
        [".gif"] = "image/gif"
    };

    private readonly IConfiguration _configuration;
    private readonly ILogger<OciStorageService> _logger;
    private readonly string _namespaceName;
    private readonly string _bucketName;
    private readonly string _endpointBase;

    /// <summary>
    /// O <see cref="ObjectStorageClient"/> é caro de criar (negocia
    /// credenciais e monta o pipeline HTTP) e é thread-safe: um único client
    /// por aplicação, criado no primeiro upload. O semáforo evita que dois
    /// uploads simultâneos criem dois clients.
    /// </summary>
    private readonly SemaphoreSlim _clientLock = new(1, 1);

    private ObjectStorageClient? _client;

    public OciStorageService(IConfiguration configuration, ILogger<OciStorageService> logger)
    {
        _configuration = configuration;
        _logger = logger;
        _namespaceName = Require(configuration, "OCI:Namespace");
        _bucketName = Require(configuration, "OCI:BucketName");
        _endpointBase = ResolveEndpointBase(configuration);
    }

    public async Task<string> UploadImageAsync(IFormFile file)
    {
        ArgumentNullException.ThrowIfNull(file);

        var objectName = BuildObjectName(file);
        var contentType = ResolveContentType(file);

        // O try começa antes do GetClientAsync: falha ao resolver credencial
        // (sem ~/.oci/config, sem instance principal) também é problema de
        // infraestrutura e precisa virar StorageUploadException, não 500.
        try
        {
            var client = await GetClientAsync();
            using var stream = file.OpenReadStream();

            var request = new PutObjectRequest
            {
                NamespaceName = _namespaceName,
                BucketName = _bucketName,
                ObjectName = objectName,
                PutObjectBody = stream,
                ContentType = contentType,
                // A SDK precisa do tamanho para assinar o request: o stream do
                // multipart não é seekable e não permite descobrir sozinha.
                ContentLength = file.Length
            };

            await client.PutObject(request);
        }
        catch (OperationCanceledException)
        {
            // Cliente cancelou/desconectou: não é falha do bucket, deixa subir.
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Falha ao enviar a imagem '{ObjectName}' ({Length} bytes) para o bucket '{Bucket}' do OCI Object Storage.",
                objectName,
                file.Length,
                _bucketName);

            throw new StorageUploadException(
                $"Não foi possível enviar a imagem para o OCI Object Storage (bucket '{_bucketName}').",
                ex);
        }

        _logger.LogInformation(
            "Imagem '{ObjectName}' ({Length} bytes) publicada no bucket '{Bucket}'.",
            objectName,
            file.Length,
            _bucketName);

        return BuildPublicUrl(objectName);
    }

    /// <summary>
    /// Nome único do objeto: Guid (sem hífen) + extensão. O nome original
    /// nunca vai para o bucket — ele carrega dado de quem enviou
    /// ("print-da-camila.png") e a URL é pública.
    /// </summary>
    private static string BuildObjectName(IFormFile file) =>
        $"{Guid.NewGuid():N}{ResolveExtension(file)}";

    /// <summary>
    /// Extensão (com o ponto, minúscula) derivada do nome do arquivo; quando
    /// o nome não traz extensão útil, deriva do ContentType.
    /// </summary>
    private static string ResolveExtension(IFormFile file)
    {
        var extension = Path.GetExtension(file.FileName)?.ToLowerInvariant();
        if (!string.IsNullOrEmpty(extension) && ExtensionToContentType.ContainsKey(extension))
        {
            return extension;
        }

        var contentType = ResolveContentType(file);
        var match = ExtensionToContentType
            .FirstOrDefault(pair => string.Equals(pair.Value, contentType, StringComparison.OrdinalIgnoreCase));

        return string.IsNullOrEmpty(match.Key) ? ".bin" : match.Key;
    }

    /// <summary>ContentType do objeto: o informado pelo cliente, quando existe.</summary>
    private static string ResolveContentType(IFormFile file)
    {
        if (!string.IsNullOrWhiteSpace(file.ContentType))
        {
            return file.ContentType;
        }

        return ExtensionToContentType.TryGetValue(Path.GetExtension(file.FileName), out var contentType)
            ? contentType
            : "application/octet-stream";
    }

    /// <summary>
    /// URL pública do objeto, no formato do OCI:
    /// <c>{endpoint}/n/{namespace}/b/{bucket}/o/{objeto}</c>.
    /// <para>
    /// A URL só abre sem credencial se o bucket (ou o objeto) permitir leitura
    /// pública. Bucket privado exige Pre-Authenticated Request (PAR).
    /// </para>
    /// </summary>
    private string BuildPublicUrl(string objectName) =>
        $"{_endpointBase}/n/{_namespaceName}/b/{_bucketName}/o/{Uri.EscapeDataString(objectName)}";

    private async Task<ObjectStorageClient> GetClientAsync()
    {
        if (_client is not null)
        {
            return _client;
        }

        await _clientLock.WaitAsync();
        try
        {
            _client ??= new ObjectStorageClient(CreateAuthenticationProvider(), new ClientConfiguration(), _endpointBase);
            return _client;
        }
        finally
        {
            _clientLock.Release();
        }
    }

    /// <summary>
    /// Credenciais do OCI. Na VM: Instance Principals, sem chave no disco.
    /// Fora da OCI (local), o instance principal falha na construção e aí
    /// entra o config file do OCI CLI.
    /// </summary>
    private IBasicAuthenticationDetailsProvider CreateAuthenticationProvider()
    {
        if (string.Equals(_configuration["OCI:AuthMode"], "ConfigFile", StringComparison.OrdinalIgnoreCase))
        {
            return CreateConfigFileAuthenticationProvider();
        }

        try
        {
            var provider = new InstancePrincipalsAuthenticationDetailsProvider();
            _logger.LogInformation("OCI Object Storage: autenticando com Instance Principals.");
            return provider;
        }
        catch (Exception ex)
        {
            // Esperado em desenvolvimento: fora de uma instância da OCI não
            // existe metadata service (169.254.169.254) para responder.
            _logger.LogWarning(
                ex,
                "OCI Object Storage: Instance Principals indisponível ({Motivo}); usando o config file do OCI CLI.",
                ex.Message);

            return CreateConfigFileAuthenticationProvider();
        }
    }

    private IBasicAuthenticationDetailsProvider CreateConfigFileAuthenticationProvider()
    {
        var profile = string.IsNullOrWhiteSpace(_configuration["OCI:Profile"])
            ? "DEFAULT"
            : _configuration["OCI:Profile"]!;
        var configFilePath = _configuration["OCI:ConfigFilePath"];

        return string.IsNullOrWhiteSpace(configFilePath)
            ? new ConfigFileAuthenticationDetailsProvider(profile)
            : new ConfigFileAuthenticationDetailsProvider(configFilePath, profile);
    }

    /// <summary>
    /// Endpoint do serviço — é também a base da URL pública do objeto.
    /// Padrão: <c>https://objectstorage.{region}.oraclecloud.com</c>.
    /// </summary>
    private static string ResolveEndpointBase(IConfiguration configuration)
    {
        var region = Require(configuration, "OCI:Region");
        var template = configuration["OCI:Endpoint"];

        if (string.IsNullOrWhiteSpace(template))
        {
            template = "https://objectstorage.{region}.oraclecloud.com";
        }

        return template.Replace("{region}", region, StringComparison.OrdinalIgnoreCase).TrimEnd('/');
    }

    private static string Require(IConfiguration configuration, string key) =>
        configuration[key] is { Length: > 0 } value
            ? value
            : throw new InvalidOperationException(
                $"A configuração '{key}' é obrigatória para publicar imagens no OCI Object Storage.");

    /// <summary>
    /// Como este serviço é Singleton, o container de DI chama este método no
    /// shutdown da aplicação: fecha o client HTTP do OCI e o semáforo de
    /// inicialização.
    /// </summary>
    public void Dispose()
    {
        _client?.Dispose();
        _clientLock.Dispose();
        GC.SuppressFinalize(this);
    }
}
