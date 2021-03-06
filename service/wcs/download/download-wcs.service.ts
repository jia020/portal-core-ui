
import {throwError as observableThrowError,  Observable } from 'rxjs';

import {timeoutWith, map, catchError} from 'rxjs/operators';
import { Bbox } from '../../../model/data/bbox.model';
import { LayerModel } from '../../../model/data/layer.model';
import { Constants } from '../../../utility/constants.service';
import { LayerHandlerService } from '../../cswrecords/layer-handler.service';
import {HttpClient, HttpParams, HttpHeaders, HttpResponse} from '@angular/common/http';
import {Injectable, Inject} from '@angular/core';


/**
 * Use OlMapService to add layer to map. This service class adds wfs layer to the map
 */
@Injectable()
export class DownloadWcsService {



  constructor(private layerHandlerService: LayerHandlerService, private http: HttpClient, @Inject('env') private env) {

  }

  /**
   * Download the layer as a zip file
   * @param layer the layer to download
   * @param bbox the bounding box of the area to download
   * @param inputCrs coordinate reference system of bounding box
   * @param downloadformat requests a download in a certain format
   * @param outputCrs coord reference system for the download
   * @return observable containing the download or error
   */
  public download(layer: LayerModel, bbox: Bbox, inputCrs: string, downloadFormat: string, outputCrs: string): Observable<any> {
    try {
      const ftpResources = this.layerHandlerService.getOnlineResources(layer, Constants.resourceType.FTP);
      const ftpURL = (ftpResources.length > 0) ? ftpResources[0]['url'] : '';
      const wcsResources = this.layerHandlerService.getWCSResource(layer);

      let httpParams = new HttpParams();
      httpParams = httpParams.set('layerName', wcsResources[0].name);
      httpParams = httpParams.set('serviceUrl', wcsResources[0].url);
      httpParams = httpParams.set('usingBboxConstraint', 'on');
      httpParams = httpParams.set('northBoundLatitude', bbox.northBoundLatitude.toString());
      httpParams = httpParams.set('southBoundLatitude', bbox.southBoundLatitude.toString());
      httpParams = httpParams.set('eastBoundLongitude', bbox.eastBoundLongitude.toString());
      httpParams = httpParams.set('westBoundLongitude', bbox.westBoundLongitude.toString());

      httpParams = httpParams.set('outputDimensionsType', 'widthHeight');
      httpParams = httpParams.set('outputWidth', '256');
      httpParams = httpParams.set('outputHeight', '256');

      httpParams = httpParams.set('inputCrs', inputCrs);
      httpParams = httpParams.set('downloadFormat', downloadFormat);
      httpParams = httpParams.set('outputCrs', outputCrs);
      httpParams = httpParams.set('ftpURL', ftpURL);

      return this.http.get(this.env.portalBaseUrl + 'downloadWCSAsZip.do', {
        params: httpParams,
        responseType: 'blob'
      }).pipe(timeoutWith(360000, observableThrowError(new Error('Request have timeout out after 5 minutes'))),
        map((response) => { // download file
          return response;
	  }), catchError((error: HttpResponse<any>) => {
          return observableThrowError(error);
        }), );
    } catch (e) {
      return observableThrowError(e);
    }

  }

  /**
   *  Describe coverage
   *  @param serviceUrl URL of the WCS
   *  @param coverageName name of coverage
   *  @return observable containing the describe coverage response or error
   */
   public describeCoverage(serviceUrl: string, coverageName: string): Observable<any> {
    let httpParams = new HttpParams();
    httpParams = httpParams.append('serviceUrl', serviceUrl);
    httpParams = httpParams.append('coverageName', coverageName);

    return this.http.post(this.env.portalBaseUrl + 'describeCoverage.do', httpParams.toString(), {
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType: 'json'
    }).pipe(map(response => {
      if (response['success'] === true) {
        return response['data'][0];
      } else {
        return observableThrowError(response['msg']);
      }
    }), catchError(
    (error: HttpResponse<any>) => {
        return observableThrowError(error);
      }
      ), );
  }
}
