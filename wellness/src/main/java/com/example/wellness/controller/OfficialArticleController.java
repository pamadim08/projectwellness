package com.example.wellness.controller;


import com.example.wellness.model.OfficialArticle;
import com.example.wellness.service.OfficialArticleService;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;


import java.util.List;



@RestController
@RequestMapping("/api/articles")
@CrossOrigin(origins = "http://localhost:3000")
public class OfficialArticleController {



    @Autowired
    private OfficialArticleService service;



    @GetMapping
    public List<OfficialArticle> listOfficialArticle(){

        return service.listOfficialArticle();
    }




    @GetMapping("/{id}")
    public OfficialArticle viewArticleDetail(
            @PathVariable Integer id
    ){

        return service.viewArticleDetail(id);
    }




    @PostMapping
    public OfficialArticle createOfficialArticle(
            @RequestBody OfficialArticle article
    ){

        return service.createOfficialArticle(article);
    }





    @PutMapping("/{id}")
    public OfficialArticle editOfficialArticle(
            @PathVariable Integer id,
            @RequestBody OfficialArticle article
    ){

        return service.editOfficialArticle(id, article);
    }




    @DeleteMapping("/{id}")
    public String deleteArticle(
            @PathVariable Integer id
    ){

        boolean result =
                service.deleteArticle(id);


        return result ?
                "Delete success":
                "Not found";

    }

}