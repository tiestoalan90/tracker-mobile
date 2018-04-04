import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import { Observable } from 'rxjs';
import { Http } from '@angular/http';
import { Injectable } from '@angular/core';
import { Platform } from 'ionic-angular';
import { CORDOVA} from '../../config/app-constants';
import { URL_TRACKER_SERVICE,WORKITEMS_FLOW} from '../../config/url.services';
import { Cases} from '../../app/clases/entities/cases';
import { WorkItemElementRepository} from '../repository/workitem-element';
import { CasesRepository} from '../repository/cases';
import { ElementTypeConfigAttributeRepository} from '../repository/element-type-config-attributes';
import { WorkitemElement} from '../../app/clases/entities/workitem-element';
import { ElementTypeConfigAttribute} from '../../app/clases/entities/element-type-config-attributes';
import dateFormat from 'dateformat';
import { DT_FORMAT } from '../../config/app-constants';
import * as _ from "lodash";

@Injectable()
export class WorkitemFlowProvider {

  workitemflow:WorkitemElement[]=[];
  etypeList:ElementTypeConfigAttribute[]=[];
  constructor(private http: Http,
              private platform:Platform,
              private workItemElementRepository:WorkItemElementRepository,
              private elementTypeConfigAttributeRepository:ElementTypeConfigAttributeRepository,
              private casesRepository:CasesRepository) {

  }

  public shareCases(cases:Cases,areaId:number):Observable<any>{
    let caseItem=_.cloneDeep(cases);
    let url=URL_TRACKER_SERVICE+WORKITEMS_FLOW+"?elementId="+caseItem.elementId
        +"&caseId="+caseItem.caseId+"&areaId="+areaId;
        caseItem.shared=1;
        caseItem.sharedDate=''+dateFormat(new Date(),DT_FORMAT,true);
        return Observable.create(observer=>{
                      this.http.get(url).subscribe(resp=>{
                        let data_resp= resp.json();
                        if(data_resp!=null){

                          Observable.forkJoin([this.processEtypeConfig(data_resp.elementTypeConfigAttribute),
                                              this.processWiElement(data_resp.workFlow),
                                              this.casesRepository.update(caseItem)])
                                .subscribe(resp => {
                                   console.log("Resp fork all observables:"+resp+" ");
                                   let boolean=resp[0]&&resp[1];
                                   if(resp[2]){
                                     observer.next([boolean,caseItem]);
                                   }else{
                                     observer.next([boolean,cases]);
                                   }

                                  observer.complete();

                          }, err=>{
                               console.log("Error processing all observables:"+err);
                               observer.error(err);
                            })

                        }

                        },(error) => {
                            console.log(error.status);
                          observer.error(error);
                  })
            })

  }

  public deleteCases(cases:Cases):Observable<any>{
        let caseItem=_.cloneDeep(cases);
        caseItem.shared=0;
    return Observable.create(observer=>{
              Observable.forkJoin(
                [this.workItemElementRepository.deleteByCaseId(caseItem.caseId),
                 this.casesRepository.update(caseItem)])
                      .subscribe(resp => {
                      console.log("Resp fork all observables:"+resp+" ");
                      let boolean=resp[0]&&resp[1];
                      if(boolean){
                        observer.next([boolean,caseItem]);
                      }else{
                        observer.next([boolean,cases]);
                      }

                      observer.complete();
                      }, err=>{
                               console.log("Error processing all observables:"+err);
                               observer.error(err);
                      })


                  })
  }

  private processWiElement(list:any):Promise<boolean>{
  return Observable.create(observer=>{
      let response:boolean=true;
      let listObservables:Observable<boolean>[]=[];
      list.forEach(data=>{
        let wi=new WorkitemElement();
        console.log("WIElement:"+JSON.stringify(data));
        wi.caseId=data.caseId;
        wi.elementId=data.elementId;
        wi.elementTypeConfigId=data.elementTypeConfigId;
        wi.notes=data.notes;
        wi.order=data.order;
        wi.parent=data.parent;
        wi.sequencial=data.sequencial;
        wi.workItemStatus=data.workItemStatus;
        wi.workItemStatusId=data.workItemStatusId;
        wi.workitemElementId=data.workitemElementId;
        wi.workitemTemplate=data.workitemTemplate;
        wi.workitemTemplateId=data.workitemTemplateId;
        this.workitemflow.push(wi);
        listObservables.push(this.workItemElementRepository.insert(wi));

        })

      if(this.platform.is(CORDOVA)&&listObservables.length){
        Observable.forkJoin(listObservables).subscribe(resolvedData => {
                  console.log("Observables wi:"+resolvedData);
                  response=resolvedData.filter(resp=>!resp).length==0;
            console.log("Resolve value"+response)
            observer.next(response);
            observer.complete();

          }, err=>{console.error(err)});
      }else{
        observer.next(response);
        observer.complete();
      }

      });
  }

  private processEtypeConfig(list:any):Observable<boolean>{
    let response:boolean=true;
    let listObservables:Observable<boolean>[]=[];
    return Observable.create(observer=>{
    list.forEach(data=>{
      console.log("Element Type: "+JSON.stringify(data));
      let etype=new ElementTypeConfigAttribute();
      etype.attributeId=data.attributeId;
      etype.attributeTypeId=data.attributeTypeId;
      etype.comboCategoryId=data.comboCategoryId;
      etype.elementTypeConfigId=data.elementTypeConfigId;
      etype.mandatory=data.mandatory;
      this.etypeList.push(etype);
      listObservables.push(this.elementTypeConfigAttributeRepository.insert(etype));
    });

    if(this.platform.is(CORDOVA)&&listObservables.length){

      Observable.forkJoin(listObservables).subscribe(resolvedData => {
                console.log("Observables etype:"+resolvedData);
                response=resolvedData.filter(resp=>!resp).length==0;

          console.log("Resolve value"+response);
          observer.next(response);
          observer.complete();

        }, err=>{console.error(err)});
    }else{
      observer.next(response);
      observer.complete();
    }


  })

}

}