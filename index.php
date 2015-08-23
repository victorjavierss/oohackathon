<?php

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/lib/OoyalaAPI.php';


use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;


const APPLICATION_NAME = " | Ooyala";
const OOYALA_API_KEY = '01bXExOlsXvZN75zdTp-QCTJeOVQ.oTUFr';
const OOYALA_API_SECRET = "udHaAhi35KFOQLK2DYViVe5WgRTCseLQp-c6HKV_";


$app = new Silex\Application();
$app['debug'] = true;

$config = parse_ini_file('base.ini');

$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] != 'off') ? 'https://' : '//';
$config['baseurl'] = $protocol . $config['baseurl'];

$api = new OoyalaAPI( OOYALA_API_KEY, OOYALA_API_SECRET);

$app->register(new Silex\Provider\TwigServiceProvider(), array(
  'twig.path' => __DIR__ . DIRECTORY_SEPARATOR . 'views',
));

$app->register(new Silex\Provider\SessionServiceProvider());
$app->register(new Silex\Provider\UrlGeneratorServiceProvider());

$app->get('/', function () use ($app, $config, $api) {
  $videos_data = $api->get("/v2/assets");
  return $app['twig']->render('videos.twig', array(
    'APPLICATION_NAME' => "Reflection" . APPLICATION_NAME,
    'BASEURL' => $config['baseurl'],
    'videos' => $videos_data->items
  ));
})->bind('homepage');

$app->get('/edit/{embed}', function ($embed) use ($app, $config, $api) {
  return $app['twig']->render('edit.twig', array(
    'APPLICATION_NAME' => "Reflection" . APPLICATION_NAME,
    'BASEURL' => $config['baseurl'],
    'video_data' => $api->get("/v2/assets/{$embed}")
  ));
})->bind('edit');

$app->post('/file_upload', function (Request $request) use ($app, $api, $config) {
  $image_file = current($_FILES);
  if( $image_file["error"] === 0 ) {
      $url = FALSE;
      $target_dir = $config['target_assets_dir'];
      if (is_writable ($target_dir)) {
        $provider = $request->get('provider', FALSE);
        $target_dir = $target_dir . DIRECTORY_SEPARATOR . $provider;
        if (!file_exists($target_dir)) {
          mkdir ($target_dir);
        }
        if (is_writable ($target_dir)) {
          $final_filename = md5($image_file['name']);
          $target_file =  $target_dir . DIRECTORY_SEPARATOR . $final_filename;
          $error = !move_uploaded_file( $image_file["tmp_name"], $target_file);
          $url = $config['assets_url']
                . '/' . $provider
                . '/' . $final_filename;
        } else {
          $error = TRUE;
        }
      } else {
        $error = TRUE;
      }
      $response = [ 'valid' => !$error  ];
      $url && $response['url'] = $url;
      $responseCode = $url ? 200 : 400;
  } else {
    $responseCode = 400;
    $response = ['valid' => false, 'error'=>'Error in file'];
  }
  $response = new Response(json_encode($response), $responseCode);
  $response->headers->addCacheControlDirective('must-revalidate', true);
  $response->headers->set('Content-Type', 'application/javascript');
  return $response;
});

$app->post('/save_cues', function (Request $request) use ($app, $api, $config) {

  $target_dir = $config['target_cues_dir'];

  if (is_writable ($target_dir)) {

    $provider = $request->get('provider', FALSE);
    $target_dir = $target_dir . DIRECTORY_SEPARATOR . $provider;

    if (!file_exists($target_dir)) {
      mkdir ($target_dir);
    }

    if (is_writable ($target_dir)) {
      $cues = $request->get('cues', FALSE);
      if ($cues) {
        $cues = json_encode($cues);
        $final_filename = $request->get('embed', FALSE);
        $target_file =  $target_dir . DIRECTORY_SEPARATOR . $final_filename;
        $saved =  file_put_contents($target_file, $cues);
        $error = ($saved === FALSE);
      } else {
        $error = TRUE;
      }
    } else {
      $error = TRUE;
    }
  } else {
    $error = TRUE;
  }

  $response = array('valid'=>!$error);
  $responseCode = $error ? 400 : 200;

  $response = new Response(json_encode($response), $responseCode);
  $response->headers->addCacheControlDirective('must-revalidate', true);
  $response->headers->set('Content-Type', 'application/javascript');
  return $response;
});

$app->run();